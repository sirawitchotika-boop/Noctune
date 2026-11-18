import { fileIdentity, isAudioFile, orderedTracks, playlistName } from './library-rules.js';

const DEFAULT_NAME = 'NoctuneLibrary';
const VERSION = 1;

function transaction(db, storeNames, mode, callback) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(storeNames, mode); } catch (error) { reject(error); return; }
    let output;
    let explicitError;
    const fail = (error) => {
      explicitError = error;
      try { tx.abort(); } catch { /* It may have already aborted. */ }
    };
    tx.oncomplete = () => resolve(output);
    tx.onabort = () => reject(explicitError || tx.error || new Error('Database transaction failed.'));
    try { callback(tx, value => { output = value; }, fail); } catch (error) { fail(error); }
  });
}

export class MusicLibrary {
  constructor({ indexedDB = globalThis.indexedDB, name = DEFAULT_NAME } = {}) {
    this.factory = indexedDB;
    this.name = name;
    this.opening = null;
  }

  async open() {
    if (this.opening) return this.opening;
    if (!this.factory) throw new Error('Local storage is unavailable on this device.');
    this.opening = new Promise((resolve, reject) => {
      const request = this.factory.open(this.name, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tracks')) {
          const tracks = db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
          tracks.createIndex('identity', 'identity', { unique: true });
        }
        if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.opening = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Could not open music storage.'));
      request.onblocked = () => reject(new Error('Close other Noctune windows and retry.'));
    });
    try { return await this.opening; }
    catch (error) { this.opening = null; throw error; }
  }

  async close() {
    if (this.opening) (await this.opening).close();
    this.opening = null;
  }

  async tracks() {
    const db = await this.open();
    const data = await transaction(db, ['tracks'], 'readonly', (tx, done) => {
      tx.objectStore('tracks').getAll().onsuccess = event => done(event.target.result);
    });
    return orderedTracks(data);
  }

  async playlists() {
    const db = await this.open();
    return transaction(db, ['playlists'], 'readonly', (tx, done) => {
      tx.objectStore('playlists').getAll().onsuccess = event => done(event.target.result);
    });
  }

  async importAudio(fileList) {
    const files = Array.from(fileList || []);
    let added = 0;
    let duplicates = 0;
    let rejected = 0;
    const db = await this.open();
    for (const file of files) {
      if (!isAudioFile(file)) { rejected++; continue; }
      try {
        const outcome = await transaction(db, ['tracks', 'audio'], 'readwrite', (tx, done) => {
          const tracks = tx.objectStore('tracks');
          tracks.index('identity').get(fileIdentity(file)).onsuccess = event => {
            if (event.target.result) { done('duplicate'); return; }
            const add = tracks.add({
              identity: fileIdentity(file),
              name: file.name,
              size: file.size,
              type: file.type || '',
              addedAt: Date.now(),
              favorite: false
            });
            add.onsuccess = () => {
              tx.objectStore('audio').put({ id: add.result, blob: file });
              done('added');
            };
          };
        });
        if (outcome === 'duplicate') duplicates++;
        else added++;
      } catch (error) {
        const message = error?.name === 'QuotaExceededError'
          ? 'Storage is full. No existing music was removed.'
          : 'Import stopped because this file could not be saved.';
        const failure = new Error(message);
        failure.added = added;
        failure.duplicates = duplicates;
        failure.rejected = rejected;
        throw failure;
      }
    }
    return { added, duplicates, rejected };
  }

  async setFavorite(trackId, favorite) {
    const db = await this.open();
    return transaction(db, ['tracks'], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore('tracks');
      store.get(trackId).onsuccess = event => {
        const track = event.target.result;
        if (!track) { fail(new Error('Song no longer exists.')); return; }
        track.favorite = Boolean(favorite);
        store.put(track);
        done(track.favorite);
      };
    });
  }

  async createPlaylist(value) {
    const name = playlistName(value);
    const db = await this.open();
    return transaction(db, ['playlists'], 'readwrite', (tx, done) => {
      const request = tx.objectStore('playlists').add({ name, trackIds: [] });
      request.onsuccess = () => done(request.result);
    });
  }

  async renamePlaylist(id, value) {
    const name = playlistName(value);
    return this.editPlaylist(id, playlist => { playlist.name = name; });
  }

  async addToPlaylist(id, trackId) {
    const db = await this.open();
    return transaction(db, ['playlists', 'tracks'], 'readwrite', (tx, done, fail) => {
      const trackReq = tx.objectStore('tracks').get(trackId);
      trackReq.onsuccess = () => {
        if (!trackReq.result) { fail(new Error('Song no longer exists.')); return; }
        const store = tx.objectStore('playlists');
        store.get(id).onsuccess = event => {
          const playlist = event.target.result;
          if (!playlist) { fail(new Error('Playlist no longer exists.')); return; }
          if (!playlist.trackIds.includes(trackId)) {
            playlist.trackIds.push(trackId);
            store.put(playlist);
          }
          done(playlist);
        };
      };
    });
  }

  async editPlaylist(id, edit) {
    const db = await this.open();
    return transaction(db, ['playlists'], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore('playlists');
      store.get(id).onsuccess = event => {
        const playlist = event.target.result;
        if (!playlist) { fail(new Error('Playlist no longer exists.')); return; }
        edit(playlist);
        store.put(playlist);
        done(playlist);
      };
    });
  }

  async removeFromPlaylist(id, trackId) {
    return this.editPlaylist(id, playlist => {
      playlist.trackIds = playlist.trackIds.filter(value => value !== trackId);
    });
  }

  async clearPlaylist(id) {
    return this.editPlaylist(id, playlist => { playlist.trackIds = []; });
  }

  async deletePlaylist(id) {
    const db = await this.open();
    return transaction(db, ['playlists'], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore('playlists');
      store.get(id).onsuccess = event => {
        if (!event.target.result) { fail(new Error('Playlist no longer exists.')); return; }
        store.delete(id);
        done(true);
      };
    });
  }

  // Only the explicit Library delete action should call this; playlist removal never does.
  async deleteTrackPermanently(trackId) {
    const db = await this.open();
    return transaction(db, ['tracks', 'audio', 'playlists'], 'readwrite', (tx, done, fail) => {
      const tracks = tx.objectStore('tracks');
      tracks.get(trackId).onsuccess = event => {
        if (!event.target.result) { fail(new Error('Song no longer exists.')); return; }
        const playlists = tx.objectStore('playlists');
        playlists.getAll().onsuccess = listEvent => {
          for (const playlist of listEvent.target.result) {
            if (!playlist.trackIds.includes(trackId)) continue;
            playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
            playlists.put(playlist);
          }
          tracks.delete(trackId);
          tx.objectStore('audio').delete(trackId);
          done(true);
        };
      };
    });
  }
}
