"""How a whole Reading sums, simulated (Derek, 2026-10-10: "feels like we get more positive than negative, should be
balanced"). Plays N Readings with the real data (data/reading_spread.json, data/reading.json) and the real draw rules of
ui/reading.gd: the calling's card at the crown (a calling at random); for each place but the last, three drawn blind
from the shuffled deck, each turned upright or reversed at the draw (reversed 32 in 100), one of them chosen (blind to
what it does, so at random), the other two back in the deck; the last card one blind draw; every card's effect for its
place and way up summed, then held within the caps, as the game does. Then it counts what the hand gave and what it
took, by number of lines and by worth (data/reading.json "value", the same table the effects are balanced by).

  python tools/reading/balance_check.py [N]
"""
import os
import sys
import json
import random
import statistics

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REV = 0.32


def load():
    with open(os.path.join(ROOT, "data", "reading_spread.json"), encoding="utf-8") as fh:
        S = json.load(fh)
    with open(os.path.join(ROOT, "data", "reading.json"), encoding="utf-8") as fh:
        R = json.load(fh)
    return S, R


def reading(S, R, rng):
    cls = rng.choice(sorted(R["stars"]))
    fx = [dict(R["stars"][cls].get("fx", {}))]
    deck = list(S["mantles"])
    rng.shuffle(deck)
    for p in S["places"]:
        pid = p["id"]
        if pid != "under" and len(deck) >= 3:
            three = [(deck.pop(), rng.random() < REV) for _ in range(3)]
            m, rev = three.pop(rng.randrange(3))
            deck.extend(c for c, _ in three)
            rng.shuffle(deck)
        else:
            m, rev = deck.pop(rng.randrange(len(deck))), rng.random() < REV
        fx.append(m["fx"][pid][1 if rev else 0])
    total = {}
    for f in fx:
        for k, v in f.items():
            total[k] = total.get(k, 0) + v
    caps = R.get("caps", {})
    for k in list(total):
        if k in caps:
            total[k] = max(-caps[k], min(caps[k], total[k]))
        if total[k] == 0:
            del total[k]
    return total, fx


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10000
    S, R = load()
    V = R["value"]
    rng = random.Random(7)
    pos_n, neg_n, pos_w, neg_w, net = [], [], [], [], []
    card_net = []
    keys = {}
    for _ in range(n):
        total, fx = reading(S, R, rng)
        pn = sum(1 for v in total.values() if v > 0)
        nn = sum(1 for v in total.values() if v < 0)
        pw = sum(V.get(k, 0) * v for k, v in total.items() if v > 0)
        nw = -sum(V.get(k, 0) * v for k, v in total.items() if v < 0)
        pos_n.append(pn)
        neg_n.append(nn)
        pos_w.append(pw)
        neg_w.append(nw)
        net.append(pw - nw)
        for f in fx[1:]:
            card_net.append(sum(V.get(k, 0) * v for k, v in f.items()))
        for k, v in total.items():
            keys.setdefault(k, [0, 0])[0 if v > 0 else 1] += 1
    q = statistics.quantiles(net, n=20)
    print("Readings simulated: %d" % n)
    print("lines given per Reading:  mean %.2f" % statistics.mean(pos_n))
    print("lines taken per Reading:  mean %.2f" % statistics.mean(neg_n))
    print("worth given per Reading:  mean %.2f" % statistics.mean(pos_w))
    print("worth taken per Reading:  mean %.2f" % statistics.mean(neg_w))
    print("net worth per Reading:    mean %+.2f  sd %.2f  (5%% %+.2f, median %+.2f, 95%% %+.2f)"
          % (statistics.mean(net), statistics.pstdev(net), q[0], statistics.median(net), q[-1]))
    print("Readings that net up / down / even: %d%% / %d%% / %d%%" % (
        100 * sum(1 for x in net if x > 0.05) // n, 100 * sum(1 for x in net if x < -0.05) // n,
        100 * sum(1 for x in net if -0.05 <= x <= 0.05) // n))
    print("one card's net worth: mean %+.3f (the calling's card aside)" % statistics.mean(card_net))
    res = {k: keys[k] for k in ("res", "res_fire", "res_cold", "res_poison") if k in keys}
    print("resistances in the final sum (Readings with it up, down): %s" % res)


if __name__ == "__main__":
    main()
