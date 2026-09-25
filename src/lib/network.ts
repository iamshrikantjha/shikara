import NetInfo from '@react-native-community/netinfo';

// docs/03-Phase3-Torrent-Streaming.md §7 — "Mobile data + Wi-Fi only setting"
// and "Network hands over Wi-Fi → mobile data mid-download" rows.
export async function isOnCellular(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'cellular';
}

// Fires whenever the connection type changes to cellular (including a
// mid-session Wi-Fi → mobile handover) — the caller decides what to do
// (pause + re-confirm, per docs §7).
export function subscribeToCellularHandover(onCellular: () => void): () => void {
  return NetInfo.addEventListener(state => {
    if (state.type === 'cellular') {
      onCellular();
    }
  });
}
