// Cash Pot: pays whatever is in the machine's cash pot (config.cashPot), which then restarts.
// Config: { kind: 'cashPot' }
export default {
  start(m, f, id, events) {
    m.pay(m.takeCashPot(events), id, events);
    m.afterFeature(events);
  },
};
