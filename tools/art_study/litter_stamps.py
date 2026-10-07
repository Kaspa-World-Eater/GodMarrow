"""Hand-drawn leaf and twig stamps for the wood's ground tiles (tiles_wood.py), at the 2:1 iso angle of a thing lying
flat. Each character is a tone offset from the ground's own tone under it:
  H  +2 (the lit edge's brightest)   L  +1 (lit)   B  0 (the leaf's body)   D  -1 (its dark underside / far edge)
  P  the pale underside of a curled leaf (+3)      V  a vein left on a skeleton leaf (+1, the rest see-through)
  S  shadow cast on the ground beneath (the ground darkened, the leaf not drawn)   .  nothing
The light comes from the upper left: every leaf's upper-left rim is lit and its shadow falls to the lower right.
"""

LEAVES = [
    # a broad leaf lying level
    [".HLL..",
     "LBBBD.",
     ".DDD.S",
     "..SSS."],
    # tilted up to the right
    ["...HL.",
     ".HLBD.",
     "LBBD..",
     "BDD..S",
     ".SSS.."],
    # tilted down to the right
    ["HL....",
     "LBBL..",
     ".DBBD.",
     "..DDS.",
     "...SS."],
    # small and curled
    [".HL.",
     "LBBD",
     ".DDS",
     "..SS"],
    # long and pointed, lying level
    [".HLLL...",
     "LBBBBBD.",
     "..DDD..S",
     "...SSSS."],
    # pointing toward the viewer
    [".H..",
     "LBL.",
     "LBD.",
     ".BD.",
     ".DS.",
     "..S."],
    # a pair, one over the other
    ["..HL...",
     ".LBBD..",
     "HLDD.S.",
     "LBBD.S.",
     ".DD.S..",
     "..SS..."],
    # curled up at its edges, showing its pale underside
    [".HHL.",
     "HPPBD",
     "LPDBD",
     ".DDS.",
     "..SS."],
    # an oak leaf, lobed, lying level
    [".H.HL.L..",
     "LBLBBLBD.",
     ".BBBBBBBD",
     "DBDBBDBD.",
     ".D.DD.D.S",
     "..S.SS.S."],
    # an oak leaf tilted down to the right
    ["HL.L....",
     "LBLBL...",
     ".BBBBL..",
     "..DBDBD.",
     "...DBDBS",
     "....D.SS"],
    # a skeleton leaf: only its veins are left
    [".V.V.V..",
     "..VVV...",
     "VVVVVVVV",
     "..VVV...",
     ".V.V.V.S",
     ".....SS."],
    # a big leaf, folded down its middle: one half lit, one in its own shade
    ["..HHL...",
     ".HLLBB..",
     "HLLBDDD.",
     ".LBDDD.S",
     "..DDD.SS",
     "....SSS."],
]

TWIGS = [
    ["LLL.........",
     "BBBLLL......",
     "SSSBBBLLLL..",
     "...SSSBBBBL.",
     "......SSSSB.",
     "..........S."],
    [".........LL",
     "......LLLBB",
     "..LLLBBBSS.",
     "LLBBBSSS...",
     "BBSS.......",
     "SS........."],
    ["LLLLLLLL..",
     "BBBBBBBBLL",
     "SSSSSSSSBB",
     "........SS"],
]
