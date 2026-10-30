// Fullscreen is the MCP Apps expansion mode; the desktop host chooses its panel surface.
export async function expandPanel(app) {
  const context=app.getHostContext();
  if(context?.displayMode==='fullscreen') return 'fullscreen';
  if(!context?.availableDisplayModes?.includes('fullscreen')) return null;
  const result=await app.requestDisplayMode({mode:'fullscreen'});
  return result.mode;
}
