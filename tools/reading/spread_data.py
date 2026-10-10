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


# Derek, 2026-10-09: "a bit more detailed and story like, with more meaning given in each draw. and more stuff about how
# the deck draws you". Each card's own line (upright, reversed), longer, a small story with the lore under it; and what
# it MEANS for the pilgrim (gist), read in the place it fell (READ).
STORY = {
    "unwritten": (
        "The Unwritten. A page nobody's put a word on. The last one who held it out the whole age long never wrote "
        "anything, and the age ended anyway. Blank isn't empty. Blank is waiting.",
        "Turned over, and it's still blank. Worse. That means it's been written and wiped, again and again, until "
        "the page wore thin. You can see through it if you hold it to the fire. Don't.",
        "a turn nobody has taken yet", "a story already told too many times"),
    "pilgrim": (
        "The Pilgrim. Walking. Always walking, a staff and a hood and no idea where. The pilgrim road's worn a "
        "trench in the Hide a man deep, and everyone in it is walking to something that's already dead.",
        "The Pilgrim, sat down at the side of the road with its boots off. Some stop because they've arrived. Most "
        "stop because the road ran out under them. The road always runs out.",
        "to keep walking and never ask where", "to stop, at last, and not get up"),
    "digger": (
        "The Gravedigger's Hands. Dirt under every nail and no memory of whose graves. The hands remember for it. "
        "They dig straight and they dig deep and they never once look in.",
        "The Hands, digging up. What was put down for a reason is coming back for one. The Ossuary Matron lays "
        "the dead in their order; these hands undo it.",
        "to bury what it cannot carry", "to dig up what was put down for a reason"),
    "veil": (
        "The Singed Veil. A moth with a white face, going round and round the one light that'll burn it. The moths "
        "in the high court wear faces like that. They know what the light does. They go anyway.",
        "The Veil, already burned. Nothing left to draw it now, and nothing left to lose. It's lighter, burned. "
        "Ask anything that's been in a fire.",
        "the light that burns it", "nothing, now; it has already burned"),
    "swaddling": (
        "The Swaddling. Wrapped tight against the ash and carried. On the Hide somebody's always carried and "
        "somebody always carries, and the one who carries never puts it down, not even to sleep.",
        "The Swaddling, cut open. Somebody took a knife to the cloth. Maybe to free what was in it. Maybe not. The "
        "Deep asks for children, and somebody always pays.",
        "to be carried, and to carry", "the knife that cuts the cloth"),
    "gleaner": (
        "The Gleaner. Old Scythe himself, down in his pit under the bone. He comes up once an age to take the "
        "harvest, and he has never missed one. Not one stalk. Not one.",
        "The Gleaner, reversed: the one who keeps him under. An Ossuarch with a sliver of the scythe in his plate, "
        "counting, always counting, so the old harvester stays down a little longer.",
        "the end that comes for everything", "to keep the end under, a little longer"),
    "saint": (
        "The Weeping Saint. She bleeds so they'll believe her, and they do; they always do. The girl in the iron "
        "wept until the weeping was the only thing left of her, and they made a faith of the tears.",
        "The Saint, reversed: the crowd that came to watch her. A thousand faces and not one of them looking at "
        "her. They came for the weeping. They'd come again.",
        "to suffer, so as to be believed", "to watch, and do nothing"),
    "scholar": (
        "The Scholar's Eye. Reads, and reads, and reads, until the page starts reading back. The oldest reader in "
        "the Citadel still sits at his book. He hasn't turned a page in an age. The page turns him.",
        "The Eye, turned inward: the eyes in the Needle, looking back. Once they've seen you, they don't stop. "
        "...It looked. It shouldn't have looked.",
        "to know, whatever knowing costs", "the eyes that look back"),
    "hanged": (
        "The Hanged Twin. Hung head down over still water, and in the water its twin stands upright, a breath "
        "behind it. Every still surface has one. The Drowned Twin keeps very good time.",
        "The Twin, a breath ahead. Worse. That one knows where it's going, and it's only waiting for this one to "
        "catch up. It will. They always do.",
        "a twin a breath behind it", "a twin a breath ahead, waiting"),
    "knot": (
        "The Knot of Mouths. Many mouths and one hunger, eating to keep and keeping to eat. The Second Mouth "
        "preaches it. The Tallow-Mother lives it. Round and round it goes.",
        "The Knot, reversed: the one that's eaten. Someone has to be the meal. Somebody always is. Better to know "
        "which one you are.",
        "to eat, and keep what it eats", "to be eaten"),
    "wick": (
        "The Wick. It burns down to give a little light, and the light is all that's left of it. Every lantern on "
        "the Hide has one inside: a soul that chose to stay and burn instead of going out with the breath.",
        "The Wick, reversed: the dark just past the edge of the light. Always there. Always patient. The light "
        "only ever pushes it back a step.",
        "to burn itself down for a little light", "the dark at the edge of every light"),
    "mourner": (
        "The Mourner. She cuts her hair for every one the Red takes, and the Red takes them all. The Grandmother of "
        "the Red has none left. She cuts it anyway. The shore folk say you can hear the scissors in the surf.",
        "The Mourner, reversed: the one being mourned. ...Somebody, somewhere, cut their hair for it already. Long "
        "before it came up out of the pool.",
        "grief that cuts and keeps cutting", "to be mourned, and not know it"),
    "key": (
        "The Ossuary Key. It locks the count. Nine, and nine, and nine, and every bone in its place. The Pale "
        "Order's whole faith is a key turned in a lock, and the lock is the world.",
        "The Key, reversed: the one who opens it. Somebody always does. That's why there's a key. That's why "
        "there's always somebody looking for it.",
        "to lock the count and keep it", "to open what was locked"),
    "cup": (
        "The Beggar's Cup. It knocks at the door with an empty bowl and asks, very politely, for marrow. The Ghauul "
        "ask like that. So does hunger. So does the Hide.",
        "The Cup, reversed: the house that answers the door. Don't answer the door. Whatever knocks at night on the "
        "Hide, don't answer.",
        "to ask, and keep on asking", "to open the door to what knocks"),
    "bell": (
        "The Drowned Bell. It rings under the water where nobody living hears it. The drowned king's court still "
        "walks down the old one's spine to the sound of it, in step, the whole way.",
        "The Bell, reversed: rung in tune at last. That should frighten anybody. A drowned bell isn't meant to "
        "sound right.",
        "a call only the drowned can hear", "a bell rung true, for once"),
    "coin": (
        "The First Coin. Somebody sold something at the end of the world, and here's what they got for it. The "
        "merchant on the shore picks the dead clean and sells it back. Somebody's always selling.",
        "The Coin, reversed: the one who buys. What did it buy? ...No. Don't tell me. I'd rather not know what "
        "it paid.",
        "to sell what is left", "to buy, and pay too much"),
    "kiln": (
        "The Kiln. It hardens what's given to it. Soft goes in, and doesn't come out soft. The Deep sets the old "
        "one's blood to iron in the dark under everything, slowly, the way a kiln does.",
        "The Kiln, reversed: the one that cracks in the firing. Something always cracks. Better it cracks in the "
        "fire than after.",
        "to be hardened by what it goes through", "to crack in the fire"),
    "loom": (
        "The Unravelling Loom. Somebody's picking it apart, thread by thread, and humming while they do it. The "
        "Crone behind her veil pulls out what was woven wrong. It's mostly woven wrong.",
        "The Loom, reversed: the one who weaves it back. Badly. Knots and lumps, threads from somebody else's "
        "life. But it holds. Mostly it holds.",
        "to be unpicked, thread by thread", "to be stitched back together, badly"),
    "lanternwright": (
        "The Lantern-Wright. The one who made the lanterns, and kept what was lost inside them. The makers were "
        "hunted out. There are fewer lanterns every year, and nobody left who knows how.",
        "The Wright, reversed: the one who lets it go. The light goes out the top, they say, like breath. Some of "
        "them want to go. Most of them do.",
        "to keep what was lost", "to let go what it kept"),
    "choir": (
        "The Drowned Choir. Under the crypts they're still holding the note. They've held it so long the stone hums "
        "with it, and the water in the low places shivers when you walk by.",
        "The Choir, reversed: the rest between the notes. Listen. ...There. That. That's what they're afraid of.",
        "to hold on past all breath", "the silence between notes"),
    "tithe": (
        "The Tithe. It owes. Everyone left owes: a tenth of everything, back to whatever gave them the mourning. "
        "Nobody remembers taking the loan. Everybody pays.",
        "The Tithe, reversed: the one who comes to collect. On foot, at night, very polite. Knock, knock. Not the "
        "tenth, this time. The rest.",
        "to owe, and pay", "the one who comes to collect"),
    "crown": (
        "The Hollow Crown. Orders, given and given, and nobody obeying. The Man in the Rust sits up on the dark moon "
        "and still gives them. The Hide doesn't listen. It never did.",
        "The Crown, reversed: the city that would obey if it could. It can't. It's empty. Not one left in it to "
        "hear the orders.",
        "to command, and not be obeyed", "to want to obey, and have nothing left"),
}

# what each place makes of a card: its gist read in that place (one picked each time)
READ = {
    "brow": ["On the brow: the face it shows the Hide. {g}. That's what they'll see coming. Whether it's true is "
             "another card.",
             "So that's the face it wears: {g}. Faces are lent here. It'll give this one back, one day."],
    "heart": ["Over the heart, what it wants: {g}. It'll walk the whole Hide for that, and never know why.",
              "That's what's in its heart, then: {g}. Wanting is the oldest thing on the Hide. Older than the Hide."],
    "lhand": ["In the left hand, what it holds and won't put down: {g}. It came up out of the pool already holding "
              "it.",
              "The left hand closes, and what's in it is {g}. It won't open, not for anything. Watch it try."],
    "rhand": ["The right hand opens, and what it lets go is {g}. Something always stays on the step with the rest. "
              "Old Scythe counts it.",
              "What it gives up: {g}. It won't miss it. Not yet."],
    "belly": ["Down in the belly, where the fear lives: {g}. Mind that one. Fear's the only thing here that never "
              "lies.",
              "So that's what it's afraid of: {g}. Good. The ones afraid of nothing go first."],
    "feet": ["Under the feet, the road that brought it: {g}. Roads don't end on the Hide. They just stop.",
             "It came here by {g}. It'll leave by it too. That's how roads are."],
    "under": ["And under it all, in the Red, face down till now: {g}. That's the one that's been doing the drawing. "
              "All along."],
}

# how the deck draws you: when the fan first lies down, and when a card lands
DECK_OPEN = [
    "Twenty-two of them, cut from hide and older than the count. Every one has lain on a body before this one. "
    "They remember the shape. Pick, and they'll tell it what it is. They already know.",
    "The deck. Feel it? Warm, like something that's been held a long while. It's read every one that came up out "
    "of that pool. It knows this one. It's only being polite.",
]
DRAWN = [
    "It didn't take that card. That card took it. They always do.",
    "The deck reads the hand before the hand reads the deck. It's been waiting for this hand.",
    "Hear that? A card comes off the deck the way a tooth comes out. Something's left a gap.",
    "Don't look so pleased. Nobody chooses. The cards come up the way the dead come up: when they're ready.",
    "There. It reached, and the deck let it. The deck doesn't let everyone.",
    "Warm where it touched. They like this one. That's never good.",
]
DRAWN_REV = [
    "Upside down. It came to it that way on purpose. The deck has a sense of humour, and no mercy.",
    "Reversed. The card's lying. Or it's telling the truth the wrong way up. Same thing, here.",
    "Head down, like the drowned. The deck turned this one over itself. Let's see why.",
]
CLOSE_SUM = "Here's what the cards made of it, all together. Don't ask which card did which. They won't say."

# the end, told as a story (Derek, 2026-10-09: "the end sequence needs work. More story like"): the spread told as a
# tale, one place at a time, in the order a life goes (where it came from, how it looks, what it wants and fears, what
# it holds and gives up, and under it all the card that did the drawing); {p} is the card's bible phrase ("the one who
# buries"), {g} its meaning ("to bury what it cannot carry"), {W} who wears it now
TALE = {
    "open": ["Listen. This is how it goes, for this one.",
             "Sit, then. I'll tell it the way the cards told me.",
             "Here's the story of it. It's a short one. They all are, here."],
    "feet": ["It came the way of {p}, though it won't remember the road.",
             "Its feet knew the way of {p} before it ever stood up out of the pool."],
    "brow": ["It rose out of the Red wearing the face of {p}, and the face was still wet.",
             "When it came up, the face it had on was the face of {p}. It'll wear it a long while."],
    "heart": ["What it wanted, more than anything, was {g}. It wouldn't have said so. It didn't have to.",
              "Down where the wanting lives, it wanted {g}, and it would walk the whole Hide for it."],
    "belly": ["What it feared was {g}. That fear will keep it alive longer than any blade.",
              "And under the wanting, the fear: {g}. It'll meet that one again. Fears come round."],
    "lhand": ["In its left hand it carried a thing it would not put down, and the thing was {g}.",
              "What it held on to, with the left hand, was {g}, and nothing on the Hide would make it let go."],
    "rhand": ["With the right it let something go, and what it let go was {g}. It won't miss it until much later.",
              "And the right hand opened, and what fell out of it was {g}. The step kept that, with all the rest."],
    "under": ["But that was only the top of it. Under all of it, face down in the Red the whole time, lay the card that "
              "did the drawing: {p}. {W} wears that one now. One day it might be this one's turn.",
              "That's what lay on top. Underneath, in the Red, where nobody looks, it was {p} all along. {W} has that "
              "one now. Mantles change hands. That's what hands are for."],
    "close": ["That's the story. It isn't finished. They never are.",
              "And that's where it begins. Go on. The sand's waiting. It always is.",
              "Isn't it horrible? A moment ago it was nothing, and it was so quiet."],
    "prophecy": "And the last thing the cards said, they said to it, not to me:",
}
TALE_ORDER = ["open", "feet", "brow", "heart", "belly", "lhand", "rhand", "under"]

# the choice (Derek, 2026-10-10: "I want them to feel like they are given a choice"): for every place but the one
# under the body, the deck deals three cards face up and the pilgrim chooses; the deck may still turn the chosen card
# against it (it can land reversed). ON: how a card's meaning is named in each place, shown as the pilgrim weighs it.
ON = {"brow": "On the brow", "heart": "Over the heart", "lhand": "In the left hand", "rhand": "Out of the right hand",
      "belly": "In the belly", "feet": "Under the feet"}
DEAL = {
    "brow": ["Three faces. It can wear one. The others go back in the drawer.",
             "Three come up for the brow. Choose. Choosing is the only freedom the deck allows, and it lies about that."],
    "heart": ["Three for the heart. What does it want? Go on. It's allowed to want.",
              "The heart. Three of them, face up, and every one of them hungry."],
    "lhand": ["Three for the left hand. What does it hold on to? Pick, and it'll never put it down.",
              "Left hand. Three things it might be holding. Only one fits the hand."],
    "rhand": ["Three for the right hand. What does it let go of? Choose what to lose. That's a kindness. Most never get to.",
              "Right hand. Something has to fall out of it. Three come up. Pick the one it can spare."],
    "belly": ["Three for the belly. Choose its fear. ...Choose carefully. It'll meet that one again.",
              "The belly. Three fears, face up. It only gets to keep one."],
    "feet": ["Three roads. It came by one of them. Pick which, and it'll remember the walking.",
             "The feet. Three roads lie open, and every one of them ends here."],
}
CHOSE = ["Chosen. Now let's see if the deck agrees.", "That one. The deck had a feeling it would.",
         "Good. The other two will remember being passed over."]
TURNED = ["...And the deck turns it over as it lands. It chose. The deck chose back.",
          "Head down. It chose that card; the card chose to lie the other way. That's how choosing goes here."]

def main():
    ms = []
    for (i, a, o, r, w, sy, sr) in M:
        st = STORY.get(i)
        ms.append(dict(id=i, aspect=a, one=o, rev=r, wears=w, say=st[0] if st else sy, say_rev=st[1] if st else sr,
                       gist=st[2] if st else o, gist_rev=st[3] if st else r))
    d = dict(places=PLACES, weave=WEAVE, open=OPEN, shapes=SHAPES, close=CLOSE, aspect_word=ASPECT_WORD, read=READ,
             deck_open=DECK_OPEN, drawn=DRAWN, drawn_rev=DRAWN_REV, close_sum=CLOSE_SUM, tale=TALE,
             tale_order=TALE_ORDER, on=ON, deal=DEAL, chose=CHOSE, turned=TURNED, mantles=ms)
    p = os.path.join(ROOT, "data", "reading_spread.json")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("wrote", p, len(ms), "mantles")


if __name__ == "__main__":
    main()
