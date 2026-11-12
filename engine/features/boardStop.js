// A lamp runs round a ring of prize segments and stops: at random, or where the player stops it (skill).
// Config: { kind: 'boardStop', skill: false, board: [{ label, pays }] }  (pays 0 = bust)
const boardStop = {
  start(m, f, id, events) {
    m.startStop({ kind: 'board', skill: !!f.skill, segments: f.board.length, board: f.board, feature: id, module: boardStop }, events);
  },
  onStop(m, ctx, at, events) {
    const seg = ctx.board[at];
    events.push({ type: 'board', segment: seg, at });
    if (seg.pays) m.pay(seg.pays, ctx.feature, events);
    m.afterFeature(events);
  },
};
export default boardStop;
