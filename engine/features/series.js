// Series: plays another feature a number of times in a row (e.g. 3 ride tickets = 3 spins of the ride wheel).
// Config: { kind: 'series', feature: 'rideWheel', times: 3 }
export default {
  start(m, f, id, events) {
    events.push({ type: 'series', feature: id, times: f.times });
    m.queue.unshift(...Array(f.times).fill(f.feature));
    m.afterFeature(events);
  },
};
