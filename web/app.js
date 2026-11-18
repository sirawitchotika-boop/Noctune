// Phase 1 only: switch between honest, empty library views.
const tabs = [
  {button: document.getElementById('tab-songs'), panel: document.getElementById('panel-songs')},
  {button: document.getElementById('tab-playlists'), panel: document.getElementById('panel-playlists')}
];
function showView(active) {
  for (const tab of tabs) {
    const isActive = tab === active;
    tab.button.setAttribute('aria-selected', String(isActive));
    tab.panel.hidden = !isActive;
  }
}
for (const tab of tabs) {
  tab.button.addEventListener('click', () => showView(tab));
}
