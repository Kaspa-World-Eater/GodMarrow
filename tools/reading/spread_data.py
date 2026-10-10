"""The Reading's spread (data/reading_spread.json), read by ui/reading.gd.

Derek, 2026-10-09: "come up with a way to weave a story from the card draw and how they lay/formation and let the
player interact with them more, hide the plus minus and other stats. We want this to be blind ... The only one they'll
know for sure is the class." So: one deck, the twenty-two mantles of the bible (mythology/07-who-is-who.md, the
"cards" of data/reading.json); a spread laid like a body on the cloth; every card drawn blind from the fanned deck,
landing upright or reversed, turned by the pilgrim's own hand; the Stranger speaks to each card in its place, and at
the end weaves the whole spread into one telling. What each card does in each place stays hidden (ui/reading.gd takes
it from the old pools of data/reading.json, by card and place and which way up).

The Stranger's voice (docs/wiki/mythology/areas/the-red-shore.md; Derek): he speaks through the pilgrim, to himself
and to the cards, as if no one were quite there; the pilgrim is "it"; the lore hides under the puns.

  python tools/reading/spread_data.py
"""
import os
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# the places of the spread, in the order they are drawn (the crown is the calling, face up from the start)
PLACES = [
    dict(id="brow", name="The Brow", what="the face it wore", pool="cards",
         ask=["Its brow. Every god keeps a drawer of faces. Pick it one.",
              "The brow first. A face. It came up without one."]),
    dict(id="heart", name="The Heart", what="what it is after", pool="seeks",
         ask=["The heart. What it's after. They're all after marrow, whatever they call it.",
              "Over the heart, now. Something wants it back. Draw what."]),
    dict(id="lhand", name="The Left Hand", what="what it holds", pool="answers",
         ask=["Left hand. Something was in its hand when it came up out of the Red. Draw what.",
              "The left hand. It's holding on to something. They always are."]),
    dict(id="rhand", name="The Right Hand", what="what it lets go", pool="sacs",
         ask=["Right hand. What it lets go of. Something always stays on the step with the rest.",
              "The right hand opens. Old Scythe keeps a count; leave him something to count."]),
    dict(id="belly", name="The Belly", what="what it fears", pool="fears",
         ask=["The belly. That's where the fear sits. It'll lie about this one; the card won't.",
              "Down in the belly. Put the fear here, little hide, where it can be counted."]),
    dict(id="feet", name="The Feet", what="the road it came by", pool="roads",
         ask=["The feet. A road. It came up a stair out of a pool an hour ago. Give it a road anyway. A road's a kindness.",
              "Feet. Pick it a road. It'll have walked it by mourning."]),
    dict(id="under", name="Under It, in the Red", what="what lies beneath", pool="cards",
         ask=["And one under it. Face down, in the Red. We don't read that one yet. ...Red. Read. Ha.",
              "The last goes underneath, where the Red is. Leave it lying. It'll turn when it's ready."]),
]

# the mantles: what he says to each, upright and reversed; the bible's phrase for each (who wears it upright, and
# reversed), its aspect (the card faces' sigils, tools/reading/card_fronts.py), and who wears it now
M = [
    ("unwritten", "silence", "the one who ends the turn", "the one who begins the next", "nobody yet",
     "Nothing on it. Good. It'll write itself in somebody else's hand.",
     "Turned over and still blank. That's the worst kind of full."),
    ("pilgrim", "silence", "the one who walks and does not know why", "the one who has stopped", "the pilgrim",
     "The Pilgrim. Walking. Doesn't know where. Never stopped one yet.",
     "Stopped. Sat down by the road. They do that, near the end. Or the start."),
    ("digger", "bone", "the one who buries", "the one who digs them up", "the Ossuary Matron",
     "The Hands. It's buried more than it remembers. The hands remember.",
     "Digging the other way now. Up. Mind what comes up with it."),
    ("veil", "soul", "the one drawn to the light that burns it", "the one already burned", "the moths with the white faces",
     "The Singed Veil. Goes to every light that burns it. The moths have the right of it.",
     "Already burned. Not much left to be drawn to anything."),
    ("swaddling", "flesh", "the one who is carried", "the knife that cut the cloth", "every child the Deep asks for",
     "The Swaddling. Carried. Somebody's always carried, on the Hide. Somebody always carries.",
     "The knife that cut the cloth. Somebody had to."),
    ("gleaner", "bone", "the one who ends", "the one who keeps it under", "Old Scythe, in its pit",
     "The Gleaner. Old Scythe. Comes round once an age, and never misses one.",
     "The one who keeps the Gleaner under. Heavy work. Counted work."),
    ("saint", "flesh", "the one who suffers to be believed", "the crowd that came to watch", "the girl in the iron",
     "The Weeping Saint. Suffers, so it's believed. Works every time.",
     "The crowd that came to watch her. Always a crowd. Never a face in it."),
    ("scholar", "soul", "the one who reads until it is read", "the eyes in the Needle", "the Citadel's oldest reader",
     "The Scholar's Eye. Reads until it's read. Careful what it reads here.",
     "The eyes in the Needle. Don't look back at them. ...It looked."),
    ("hanged", "soul", "the one a breath behind", "the one a breath ahead", "the Drowned Twin",
     "The Hanged Twin. A breath behind it, on the far side of every still water.",
     "A breath ahead. That one's worse. It knows where it's going."),
    ("knot", "flesh", "the one that eats to keep", "the one that is eaten", "the Second Mouth",
     "The Knot of Mouths. Eats to keep. Keeps to eat. Round it goes.",
     "The one that's eaten. Someone has to be the meal."),
    ("wick", "breath", "the one that burns down to give light", "the dark at the edge of the light", "every soul in a lantern",
     "The Wick. Burns down for a little light. Every lantern's got one in it.",
     "The dark at the edge of the light. Always just there. Patient."),
    ("mourner", "flesh", "the one who cuts her hair", "the one who is mourned", "the Grandmother of the Red",
     "The Mourner. Cuts her hair for what the Red took. The Red's never short of hair.",
     "The one who's mourned. ...Somebody cut their hair for it already."),
    ("key", "bone", "the one who locks the count", "the one who opens it", "the Ossuarch",
     "The Ossuary Key. Locks the count. Nine, and nine, and nine.",
     "The one who opens it. Somebody always does. That's why there's a key."),
    ("cup", "bone", "the one who asks at the door", "the house that answers", "the Ghauul, knocking for marrow",
     "The Beggar's Cup. Knocks at the door. Asks for marrow. Asks nicely.",
     "The house that answers. Don't answer."),
    ("bell", "breath", "the one who rings under the water", "the bell rung in tune", "the drowned king's court",
     "The Drowned Bell. Rings under the water. Only the drowned hear it, and they keep time.",
     "Rung in tune at last. That should frighten anybody."),
    ("coin", "silence", "the one who sells at the end of the world", "the one who buys", "the merchant",
     "The First Coin. Sold at the end of the world. Somebody's always selling.",
     "The one who buys. What did it buy? ...Don't tell me."),
    ("kiln", "flesh", "the one that hardens what is given to it", "the one that cracks", "the Deep",
     "The Kiln. Hardens what's given it. Goes in soft. Doesn't come out soft.",
     "The one that cracks. Something always cracks in the firing."),
    ("loom", "soul", "the one who unpicks", "the one who reweaves", "the Veiled Crone",
     "The Unravelling Loom. Somebody's picking it out, thread by thread. Not me.",
     "The one who weaves it back. Badly. There'll be lumps."),
    ("lanternwright", "breath", "the one who keeps what is lost", "the one who lets it go", "nobody now",
     "The Lantern-Wright. Keeps what's lost. Nobody makes lanterns now. Nobody.",
     "Lets it go. The light goes out of the top, they say, like breath."),
    ("choir", "breath", "the one who holds the note", "the rest between notes", "the Choir, under the crypts",
     "The Drowned Choir. Holds the note. Been holding it a long, long while.",
     "The rest between the notes. Listen. ...There. That."),
    ("tithe", "bone", "the one who owes", "the one who comes to collect", "the Tithed, every one left",
     "The Tithe. Owes. Everyone left owes. A tenth of the hide, every time.",
     "The one who comes to collect. Knock, knock."),
    ("crown", "silence", "the one whose orders are never obeyed", "the city that would obey if it could",
     "the Man in the Rust, on the dark moon",
     "The Hollow Crown. Gives orders nobody obeys. Up on the brown moon, still giving them.",
     "The city that would obey if it could. Can't. Never could."),
]

# how each place is told in the weaving, the card's phrase in its gap
WEAVE = {
    "brow": "It wore the face of {p}.",
    "heart": "It's after what {p} is after.",
    "lhand": "In its left hand, {p}.",
    "rhand": "It let go of {p}.",
    "belly": "Down in the belly, it's afraid of {p}.",
    "feet": "It came the way of {p}.",
    "under": "And under it, in the Red, face down till now: {p}. {w} wears that one.",
}
OPEN = ["Here's how it lies.", "There. Look at it lying there.", "Well. That's the hide of it. ...And what's hid in it."]
# what the spread's shape says (the order they are tried; the first few that hold are said)
SHAPES = {
    "many_rev": "Most of it lies the wrong way up. Good. So does everything here.",
    "none_rev": "Not one card turned against it. That's never happened. ...That's never good.",
    "heart_belly": "It's afraid of the very thing it wants. They always are.",
    "hands": "Both hands full of the same thing. It'll drop one.",
    "calling": "More {a} in it than it knows. It'll find out.",
    "under_rev": "And the one underneath is lying too.",
}
CLOSE = ["Isn't it horrible? A moment ago it was nothing, and it was so quiet.",
         "Up you get, then. The mouth's that way.",
         "Go on. The sand's waiting. It always is."]
ASPECT_WORD = {"bone": "bone", "soul": "thread", "flesh": "flesh", "breath": "breath", "silence": "quiet"}


def main():
    d = dict(places=PLACES, weave=WEAVE, open=OPEN, shapes=SHAPES, close=CLOSE, aspect_word=ASPECT_WORD,
             mantles=[dict(id=i, aspect=a, one=o, rev=r, wears=w, say=s, say_rev=sr) for (i, a, o, r, w, s, sr) in M])
    p = os.path.join(ROOT, "data", "reading_spread.json")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("wrote", p, len(M), "mantles")


if __name__ == "__main__":
    main()
