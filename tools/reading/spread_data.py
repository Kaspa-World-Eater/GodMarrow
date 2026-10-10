"""The Reading's spread (data/reading_spread.json), read by ui/reading.gd.

Derek, 2026-10-09: "come up with a way to weave a story from the card draw and how they lay/formation and let the
player interact with them more, hide the plus minus and other stats. We want this to be blind ... The only one they'll
know for sure is the class." So: one deck, the twenty-two mantles of the bible (mythology/07-who-is-who.md, the
"cards" of data/reading.json); a spread laid like a body on the cloth; for each place three cards drawn blind from
the fanned deck and turned over, one of them chosen, landing upright or reversed; the Stranger speaks to each card in its place, and at
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
         ask=["Its brow. Every god keeps a deck of faces, and this is one of them. Three, blind. It only gets to wear one.",
              "The brow first. A face. It came up without one. Pull three, face down, and we'll see whose faces the deck kept."]),
    dict(id="heart", name="The Heart", what="what it is after", pool="seeks",
         ask=["The heart. What it's after. They're all after marrow, whatever they call it. Three, blind.",
              "Over the heart, now. Something wants it back. Draw three, and don't look."]),
    dict(id="lhand", name="The Left Hand", what="what it holds", pool="answers",
         ask=["Left hand. Something was in its hand when it came up out of the Red. Three from the deck. Blind.",
              "The left hand. It's holding on to something. They always are. Draw three, and we'll see what."]),
    dict(id="rhand", name="The Right Hand", what="what it lets go", pool="sacs",
         ask=["Right hand. What it lets go of. Something always stays on the step with the rest. Three, face down.",
              "The right hand opens. Old Scythe keeps a count. Pull three, and leave him something to count."]),
    dict(id="belly", name="The Belly", what="what it fears", pool="fears",
         ask=["The belly. That's where the fear sits. It'll lie about this one. The cards won't. Three, blind.",
              "Down in the belly. Three, little hide, face down, where the fear can be counted."]),
    dict(id="feet", name="The Feet", what="the road it came by", pool="roads",
         ask=["The feet. A road. It came up a stair out of a pool an hour ago. Give it a road anyway. A road's a kindness. Draw three.",
              "Feet. Three roads, face down. It'll have walked one of them by mourning."]),
    dict(id="under", name="Under It, in the Red", what="what lies beneath", pool="cards",
         ask=["And one under it. Face down, in the Red. We haven't read that one yet. Read. Red. Always red.",
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
    "under": "And under it, in the Red, face down till now, {p}. {w} wears that one.",
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
        "The Gleaner, reversed, is the one who keeps him under. An Ossuarch with a sliver of the scythe in his plate, "
        "counting, always counting, so the old harvester stays down a little longer.",
        "the end that comes for everything", "to keep the end under, a little longer"),
    "saint": (
        "The Weeping Saint. She bleeds so they'll believe her, and they do; they always do. The girl in the iron "
        "wept until the weeping was the only thing left of her, and they made a faith of the tears.",
        "The Saint, reversed, is the crowd that came to watch her. A thousand faces and not one of them looking at "
        "her. They came for the weeping. They'd come again.",
        "to suffer, so as to be believed", "to watch, and do nothing"),
    "scholar": (
        "The Scholar's Eye. Reads, and reads, and reads, until the page starts reading back. The oldest reader in "
        "the Citadel still sits at his book. He hasn't turned a page in an age. The page turns him.",
        "The Eye, turned inward. The eyes in the Needle, looking back. Once they've seen you, they don't stop. "
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
        "The Knot, reversed. The one that's eaten. Someone has to be the meal. Somebody always is. Better to know "
        "which one you are.",
        "to eat, and keep what it eats", "to be eaten"),
    "wick": (
        "The Wick. It burns down to give a little light, and the light is all that's left of it. Every lantern on "
        "the Hide has one inside, a soul that chose to stay and burn instead of going out with the breath.",
        "The Wick, reversed, is the dark just past the edge of the light. Always there. Always patient. The light "
        "only ever pushes it back a step.",
        "to burn itself down for a little light", "the dark at the edge of every light"),
    "mourner": (
        "The Mourner. She cuts her hair for every one the Red takes, and the Red takes them all. The Grandmother of "
        "the Red has none left. She cuts it anyway. The shore folk say you can hear the scissors in the surf.",
        "The Mourner, reversed, is the one being mourned. ...Somebody, somewhere, cut their hair for it already. Long "
        "before it came up out of the pool.",
        "grief that cuts and keeps cutting", "to be mourned, and not know it"),
    "key": (
        "The Ossuary Key. It locks the count. Nine, and nine, and nine, and every bone in its place. The Pale "
        "Order's whole faith is a key turned in a lock, and the lock is the world.",
        "The Key, reversed. The one who opens it. Somebody always does. That's why there's a key. That's why "
        "there's always somebody looking for it.",
        "to lock the count and keep it", "to open what was locked"),
    "cup": (
        "The Beggar's Cup. It knocks at the door with an empty bowl and asks, very politely, for marrow. The Ghauul "
        "ask like that. So does hunger. So does the Hide.",
        "The Cup, reversed, is the house that answers the door. Don't answer the door. Whatever knocks at night on the "
        "Hide, don't answer.",
        "to ask, and keep on asking", "to open the door to what knocks"),
    "bell": (
        "The Drowned Bell. It rings under the water where nobody living hears it. The drowned king's court still "
        "walks down the old one's spine to the sound of it, in step, the whole way.",
        "The Bell, reversed, and rung in tune at last. That should frighten anybody. A drowned bell isn't meant to "
        "sound right.",
        "a call only the drowned can hear", "a bell rung true, for once"),
    "coin": (
        "The First Coin. Somebody sold something at the end of the world, and here's what they got for it. The "
        "merchant on the shore picks the dead clean and sells it back. Somebody's always selling.",
        "The Coin, reversed. The one who buys. What did it buy? ...No. Don't tell me. I'd rather not know what "
        "it paid.",
        "to sell what is left", "to buy, and pay too much"),
    "kiln": (
        "The Kiln. It hardens what's given to it. Soft goes in, and doesn't come out soft. The Deep sets the old "
        "one's blood to iron in the dark under everything, slowly, the way a kiln does.",
        "The Kiln, reversed, is the one that cracks in the firing. Something always cracks. Better it cracks in the "
        "fire than after.",
        "to be hardened by what it goes through", "to crack in the fire"),
    "loom": (
        "The Unravelling Loom. Somebody's picking it apart, thread by thread, and humming while they do it. The "
        "Crone behind her veil pulls out what was woven wrong. It's mostly woven wrong.",
        "The Loom, reversed. The one who weaves it back. Badly. Knots and lumps, threads from somebody else's "
        "life. But it holds. Mostly it holds.",
        "to be unpicked, thread by thread", "to be stitched back together, badly"),
    "lanternwright": (
        "The Lantern-Wright. The one who made the lanterns, and kept what was lost inside them. The makers were "
        "hunted out. There are fewer lanterns every year, and nobody left who knows how.",
        "The Wright, reversed, is the one who lets it go. The light goes out the top, they say, like breath. Some of "
        "them want to go. Most of them do.",
        "to keep what was lost", "to let go what it kept"),
    "choir": (
        "The Drowned Choir. Under the crypts they're still holding the note. They've held it so long the stone hums "
        "with it, and the water in the low places shivers when you walk by.",
        "The Choir, reversed, is the rest between the notes. Listen. ...There. That. That's what they're afraid of.",
        "to hold on past all breath", "the silence between notes"),
    "tithe": (
        "The Tithe. It owes. Everyone left owes a tenth of everything, back to whatever gave them the mourning. "
        "Nobody remembers taking the loan. Everybody pays.",
        "The Tithe, reversed. The one who comes to collect. On foot, at night, very polite. Knock, knock. Not the "
        "tenth, this time. The rest.",
        "to owe, and pay", "the one who comes to collect"),
    "crown": (
        "The Hollow Crown. Orders, given and given, and nobody obeying. The Man in the Rust sits up on the dark moon "
        "and still gives them. The Hide doesn't listen. It never did.",
        "The Crown, reversed, is the city that would obey if it could. It can't. It's empty. Not one left in it to "
        "hear the orders.",
        "to command, and not be obeyed", "to want to obey, and have nothing left"),
}

# what each place makes of a card: its gist read in that place (one picked each time)
READ = {
    "brow": ["On the brow, the face it shows the Hide. {G}. That's what they'll see coming. Whether it's true is "
             "another card.",
             "So that's the face it wears. {G}. Faces are lent here. It'll give this one back, one day."],
    "heart": ["Over the heart lies what it wants, and what it wants is {g}. It'll walk the whole Hide for that, and never know why.",
              "That's what's in its heart, then. {G}. Wanting is the oldest thing on the Hide. Older than the Hide."],
    "lhand": ["The left hand holds what it won't put down, and that's {g}. It came up out of the pool already holding "
              "it.",
              "The left hand closes, and what's in it is {g}. It won't open, not for anything. Watch it try."],
    "rhand": ["The right hand opens, and what it lets go is {g}. Something always stays on the step with the rest. "
              "Old Scythe counts it.",
              "What it gives up is {g}. It won't miss it. Not yet."],
    "belly": ["Down in the belly, where the fear lives. {G}. Mind that one. Fear's the only thing here that never "
              "lies.",
              "So that's what it's afraid of. {G}. Good. The ones afraid of nothing go first."],
    "feet": ["Under the feet, the road that brought it. {G}. Roads don't end on the Hide. They just stop.",
             "It came here by {g}. It'll leave by it too. That's how roads are."],
    "under": ["And under it all, in the Red, face down till now. {G}. That's the one that's been doing the drawing. "
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
    "Don't look so pleased. Nobody chooses. The cards come up the way the dead come up, when they're ready.",
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
              "And under the wanting, the fear. {G}. It'll meet that one again. Fears come round."],
    "lhand": ["In its left hand it carried a thing it would not put down, and the thing was {g}.",
              "What it held on to, with the left hand, was {g}, and nothing on the Hide would make it let go."],
    "rhand": ["With the right it let something go, and what it let go was {g}. It won't miss it until much later.",
              "And the right hand opened, and what fell out of it was {g}. The step kept that, with all the rest."],
    "under": ["But that was only the top of it. Under all of it, face down in the Red the whole time, lay the card that "
              "did the drawing, {p}. {W} wears that one now. One day it might be this one's turn.",
              "That's what lay on top. Underneath, in the Red, where nobody looks, it was {p} all along. {W} has that "
              "one now. Mantles change hands. That's what hands are for."],
    "close": ["That's the story. It isn't finished. They never are.",
              "And that's where it begins. Go on. The sand's waiting. It always is.",
              "Isn't it horrible? A moment ago it was nothing, and it was so quiet."],
    "prophecy": "And the last thing the cards said, they said to it, not to me.",
    # the very last words, after the sum (Derek, 2026-10-10: "we should also be told to look into the black mirror and
    # walk to it not just auto move to the next area"): he sends it to the mirror in the great face's mouth
    "go": ["Now up, and look into the mirror. The black one, in the face's mouth. Nothing looks back from it. Walk on into it anyway. There's no door here, and there never was. Only that.",
           "There's the way out, in the great face's mouth. The black mirror. Go and look into it. It won't show this one. It doesn't show anyone. Step into the dark of it, and the sand's on the other side.",
           "Go on, then. The mirror, there, in the mouth of the face. Look into it till it looks like nothing, and walk in. ...And don't look back. There's nothing to see, and it'll mind."],
}
TALE_ORDER = ["open", "feet", "brow", "heart", "belly", "lhand", "rhand", "under"]

# the calling it has become, said at the end before he sends it to the mirror (Derek, 2026-10-10: "the strangers needs
# to say more about the class you become at the end so the player really feels it when the transition happens, like an
# identity or mantle they take on, the role they become"): a coronation and a sentence at once, a paragraph to a click;
# the name it will be called, the mantle it wears, what the calling is for, and what it costs. From the class pages
# (docs/wiki/05-class-*.md) and the bible; hinted, never explained.
CALLING_NAME = {"ossumancer": "The Ossuarch", "animancer": "The Hollow Mystic", "hemomancer": "The Red Penitent",
                "miasmancer": "The Shrine Keeper", "monk": "The Empty Hand"}
CALLING = {
    "ossumancer": [
        "There. The bone took it. Look at it, standing up straighter already. An Ossuarch. The Pale Order will call it "
        "warden and mean jailer, and never once say which side of the door it keeps.",
        "That's the mantle. Black iron with bone set into it, and the count behind its eyes for the rest of the walk. "
        "Every bone out of its place is an open wound, and it will feel each one like a splinter it can't reach.",
        "What's it for? To let a thing finish. Everything the god was is still dying, and somebody has to be the one "
        "who says enough. The living will step off the road for it. Not out of respect.",
        "And the cost. The bone keeps growing, under the plate, where nobody looks. ...No. We don't say that part. "
        "Stand, warden. Stand, and don't bend. It'll break before it bends. They all do.",
    ],
    "animancer": [
        "The thread's pulled taut. The Hollow Mystic, then. Out of the Mirror, out of the circles that stopped "
        "covering the glass. The Crone has its end between her fingers, and she isn't letting go.",
        "That's the mantle. A coat of hollowed mirrors, and the dead stopping at their own faces in every one. When it "
        "passes, whoever's left will turn their mirrors to the wall. They'll call it the Glass Man. Once, kindly.",
        "What's it for? Keeping. Not saving. It saves no one. The few left on the Hide will hand it their dead because "
        "nobody else will hold them, and it will carry them, and they will never go through.",
        "And the cost. Somewhere the loom goes on and on and never finishes, and now it's a thread in it, pulling the "
        "others tight. ...Little thread. Hold still. There.",
    ],
    "hemomancer": [
        "Red. It was always going to read red. The Red Penitent. The processions will know the hat before they know the "
        "face, and the children who sing about the Tall Red Hat will stop singing when it passes.",
        "That's the mantle. Hood and welts, and the bloodletter's one rule broken on the first day. It opens itself. "
        "It draws the Maiden's door in its own blood, calls her down, and tells her what to make.",
        "What's it for? Telling a thing with no mind what the blood is for. Somebody forgot to, once, and a wound "
        "hatched. Blood given is not blood taken. It'll say that a great deal. Some days it'll believe it.",
        "And the cost. Everything it does, it pays for in its own life, and she drinks what spills. She leaves it its "
        "mind. Mostly. ...Up. The procession's going without it.",
    ],
    "miasmancer": [
        "Breathe in. ...There. A Shrine Keeper. The folk will say it steals breath. It'll say it stills it. On the Hide "
        "those are the same word in different mouths.",
        "That's the mantle. A fan, a cord at the wrist with a knot for every breath held, and a cloud at its back "
        "thinking other people's thoughts. Paper figures will turn up on doorsteps, asking it to pass by.",
        "What's it for? Holding what the wind is full of. The grudges, the lies, the sour little hopes, held longer "
        "than anyone living, until they set like steel in the chest and come out as a blade.",
        "And the cost. It holds, and it holds, and one day it walks down into the water still holding, and they call it "
        "by the name of the filth it carried. ...Not yet. Breathe out. Slowly.",
    ],
    "monk": [
        "Nothing in the bowl. Of course. The Empty Hand. The lowlands will put a coin in its palm and the coin will be "
        "gone, and they'll never be sure it was taken.",
        "That's the mantle. Gold leaf so bright the face under it disappears. To be looked at and not seen. The Peak "
        "called that holy. Everyone else calls it a beggar and steps round it.",
        "What's it for? The Silence has two hands, both empty, and both unmake. One erases with light, the other with "
        "dark. Now it's one of the hands, and it doesn't get to choose which.",
        "And the cost. Whatever it holds, it lets go. Whatever it touches goes quiet. Somewhere under the Peak a thing "
        "with no name is smiling. ...Put a name in the bowl. Any name. It won't keep.",
    ],
}

# the choice (Derek, 2026-10-10: "I want them to feel like they are given a choice"): for every place but the one
# under the body, the pilgrim draws three blind from the fanned deck (Derek, 2026-10-10: "pick 3 face down from every
# draw, then they are shown face down and flipped over"); they turn themselves over (DEAL is said then) and the pilgrim
# chooses one, the way up it turned (a reversed one turns up head down, and he says so then, TURNED); the other two go
# back in the deck. ON: what a card would mean in each place, said whole as the pilgrim weighs it ({g} its meaning).
# No colons anywhere the pilgrim reads (Derek, 2026-10-10: "dont use ':' in the text"); {G} is {g} with a capital.
ON = {"brow": "On the brow it would mean {g}.", "heart": "Over the heart it would mean {g}.",
      "lhand": "In the left hand it would mean {g}.", "rhand": "What the right hand lets go would be {g}.",
      "belly": "In the belly it would mean {g}.", "feet": "Under the feet it would mean {g}."}
DEAL = {
    "brow": ["Faces. Every one of them worn before, by someone who never gave it back.",
             "Look at them, looking up at it. They all want the brow."],
    "heart": ["Hungry, every one of them. The heart only feeds one.",
              "It's allowed to want. Wanting is what keeps them walking."],
    "lhand": ["Whatever it takes up now, it won't put down. Not for anything.",
              "Only one fits the hand. The others would have, once."],
    "rhand": ["Choose what to lose. That's a kindness. Most never get to.",
              "Something has to fall. Old Scythe is already counting."],
    "belly": ["Choose carefully. It'll meet this one again, somewhere dark.",
              "Fears. It only gets to keep one. The rest go hungry."],
    "feet": ["Every one of these roads ends here. Pick which, and it'll remember the walking.",
             "Roads. It never walked any of them, and it'll swear it walked them all."],
}
# said the moment one of the three turns up head down (Derek, 2026-10-10: "it should happen when we draw it and it flips
# to reveal with the stranger mentioning it"); the way up is settled at the draw and never changes after. Never the same
# line twice in a Reading (ui/reading.gd _line): enough of them for a whole hand of reversals.
TURNED = ["Head down, that one. Reversed. It was lying that way all along, waiting for a hand.",
          "Upside down. It came up that way on purpose. The cards have a sense of humour, and no mercy.",
          "Reversed. The card's lying. Or it's telling the truth the wrong way up. Same thing, here.",
          "That one's head down, like the drowned. If it takes that one, it takes it that way up.",
          "Turned against it already. They do that when they like a hand.",
          "Wrong way up. ...No, leave it. Nobody turns them back.",
          "See how the picture hangs? That's how it'll hang on this one too.",
          "Head down. They're fond of this one. That's never good.",
          "Upside down, and smiling about it. Some of them are like that.",
          "That one's turned. Read it the other way and it reads worse.",
          "Reversed. Somewhere a candle just leaned the wrong way.",
          "There. Head first into the Red, that one."]

# what each card means in each place of the spread, upright and reversed (Derek, 2026-10-10: "the meaning per card per
# body part reads the same, each should have a different interpretation"): the brow (the face it wears), the heart
# (what it wants), the left hand (what it holds), the right hand (what it lets go), the belly (its fear), the feet (the
# road it came by), and under the body (the hidden one). Each is said as {g} in that place's lines (ON, READ, TALE), so
# each reads after "it would mean", "is" or "was"; the card's gist stays only as a fallback.
MEANS = {
    "unwritten": {
        "brow": ("a blank face that others will write on", "a face rubbed out and drawn again too often"),
        "heart": ("to be written at last, in any hand", "to be left blank, just once"),
        "lhand": ("a clean page it won't let anyone touch", "a page worn so thin the fire shows through it"),
        "rhand": ("every story it might have been", "the one story it kept on telling"),
        "belly": ("that nothing will ever be written on it", "being written over in somebody else's hand"),
        "feet": ("a road with no marks on it at all", "a road walked so often it's only a ditch now"),
        "under": ("the turn nobody has taken, waiting under everything", "an old story, wiped and told again underneath"),
    },
    "pilgrim": {
        "brow": ("a hood and a staff and nobody under them", "the face of one sat down by the road"),
        "heart": ("to keep walking and never ask where", "to sit down at last and not get up"),
        "lhand": ("a staff worn smooth by somebody else's grip", "the boots it took off and won't put back on"),
        "rhand": ("the reason it set out", "the road itself"),
        "belly": ("arriving", "the road running out under it"),
        "feet": ("the pilgrim trench, a man deep in the Hide", "a road that ended in the middle of nowhere"),
        "under": ("a walker who never stopped, under every step", "one who stopped a long way back, and is waiting"),
    },
    "digger": {
        "brow": ("a face with grave dirt in its creases", "a face that looks into every grave it opens"),
        "heart": ("to put the past down deep and pat it flat", "to know what was buried, and why"),
        "lhand": ("a spade that has never once looked in", "a bone it dug up and won't put back"),
        "rhand": ("whatever it could not carry, into the ground", "the order the Matron laid the dead in"),
        "belly": ("a grave that won't stay filled", "what comes up with the dirt"),
        "feet": ("the long rows where the dead lie in their order", "a churned road of opened graves"),
        "under": ("everything it ever buried, lying very still", "a grave dug open from below"),
    },
    "veil": {
        "brow": ("a pale face turned always toward the fire", "a face with the singe still on it"),
        "heart": ("the one light that will burn it", "nothing at all, now the burning's done"),
        "lhand": ("a veil held up close to the flame", "ash that used to be a veil"),
        "rhand": ("its fear of the fire", "the last of what the fire left"),
        "belly": ("the dark, more than the burning", "being drawn to a light again"),
        "feet": ("a road from lamp to lamp to lamp", "a road through what has already burned"),
        "under": ("a pull toward the brightest thing in the room", "a scorch mark where something used to stand"),
    },
    "swaddling": {
        "brow": ("a face wrapped tight against the ash", "a face cut free of its wrappings"),
        "heart": ("to be carried, and to carry", "the knife, and the cut it makes"),
        "lhand": ("a bundle it won't put down even to sleep", "a short knife, still sharp"),
        "rhand": ("the one who carried it", "the cloth it was cut out of"),
        "belly": ("being set down and left", "what was in the bundle"),
        "feet": ("a road it never walked, carried the whole way", "a road away from the Deep, running"),
        "under": ("a child the Deep asked for", "the knife that answered the Deep"),
    },
    "gleaner": {
        "brow": ("the face the harvest sees last", "a counting face under a plate of bone"),
        "heart": ("the harvest, every stalk of it", "one more day before the harvest"),
        "lhand": ("a scythe that has never missed", "a sliver of the scythe, set in its own plate"),
        "rhand": ("whatever is ripe", "the count, for one moment, and the cost of that"),
        "belly": ("being the harvest", "losing count"),
        "feet": ("the road Old Scythe walks up out of his pit", "the narrow way down to the pit, to stand guard"),
        "under": ("Old Scythe, waiting for his age to come round", "someone down there counting, so he stays under"),
    },
    "saint": {
        "brow": ("a weeping face that everyone believes", "a face lost in the crowd"),
        "heart": ("to be believed, whatever it costs", "to watch, and be no part of it"),
        "lhand": ("a wound kept open so it can be shown", "a good place near the front, to see"),
        "rhand": ("its tears, to whoever will gather them", "the girl in the iron, to her weeping"),
        "belly": ("bleeding for nothing in an empty square", "being the one they come to watch"),
        "feet": ("a procession road wet with somebody's blood", "the road the crowd takes home, after"),
        "under": ("a suffering that made a faith", "a crowd of faces that did nothing"),
    },
    "scholar": {
        "brow": ("a reader's squint, gone glassy from the page", "a face the Needle has already seen"),
        "heart": ("to know, whatever knowing costs", "to be unseen again"),
        "lhand": ("a book it can't stop reading", "an eye that won't close"),
        "rhand": ("everything it read, once it knew", "the page that started reading back"),
        "belly": ("a page with nothing more to teach it", "the eyes in the Needle, turning its way"),
        "feet": ("the long stair up to the Citadel's reading rooms", "a road the Needle watched it walk"),
        "under": ("the oldest reader, who hasn't turned a page in an age", "something reading this one, line by line"),
    },
    "hanged": {
        "brow": ("a face that hangs upside down in every pool", "the face of the one waiting up ahead"),
        "heart": ("to catch up with its other half", "never to catch up at all"),
        "lhand": ("the rope it was hung by, still knotted", "a hand reaching back out of still water"),
        "rhand": ("its reflection, for one breath", "the breath it was ahead by"),
        "belly": ("still water", "the moment the twin stops waiting"),
        "feet": ("the shore of every still pool", "a road the other one already walked"),
        "under": ("the Drowned Twin, keeping very good time", "a twin a step ahead, who knows the way"),
    },
    "knot": {
        "brow": ("a mouth, and behind it another mouth", "a face with bite marks in it"),
        "heart": ("to eat, and keep what it eats", "to be swallowed and be done"),
        "lhand": ("a hunger it feeds with both hands", "a bone with its own teeth marks on it"),
        "rhand": ("the scraps, never the meal", "the last of itself, to the mouths"),
        "belly": ("an empty belly", "the Second Mouth, preaching"),
        "feet": ("a road with a mouth at both ends", "a road that goes round and round and down a throat"),
        "under": ("one hunger with many mouths", "the meal the Tallow-Mother keeps for later"),
    },
    "wick": {
        "brow": ("a face lit from below by its own burning", "a face just past where the light reaches"),
        "heart": ("to burn itself down for a little light", "the dark that waits for every flame"),
        "lhand": ("a lantern with a soul inside it", "a cold wick, burned all the way down"),
        "rhand": ("the last of its tallow, to the light", "the light, a step at a time"),
        "belly": ("going out", "the light finding it"),
        "feet": ("a road lit one lantern at a time", "the dark verge just off the lantern road"),
        "under": ("a soul that stayed to burn", "the patient dark the light only pushes back a step"),
    },
    "mourner": {
        "brow": ("a shorn head bowed toward the Red", "the face somebody is still weeping over"),
        "heart": ("grief that cuts and keeps cutting", "to be remembered by someone"),
        "lhand": ("a lock of cut hair", "a name somebody else is grieving"),
        "rhand": ("everyone the Red takes", "the one who mourns it, without knowing"),
        "belly": ("the sound of the scissors in the surf", "being forgotten by the one who cut her hair"),
        "feet": ("the tide line, walked at dusk", "a funeral road, walked the wrong way"),
        "under": ("the Grandmother of the Red, with no hair left to cut", "its own wake, held long before it rose"),
    },
    "key": {
        "brow": ("an iron face with the count behind it", "the face of whoever comes with the key"),
        "heart": ("every bone in its place", "the door the Pale Order keeps shut"),
        "lhand": ("a key that locks the count", "a key that was never meant to be turned"),
        "rhand": ("whatever it locked away", "the lock, and all it kept"),
        "belly": ("a bone out of its place", "the click of the lock giving way"),
        "feet": ("the cloisters of the Pale Order, swept bare", "a road that runs through a door left open"),
        "under": ("the lock the whole world turns in", "a hand already on the key"),
    },
    "cup": {
        "brow": ("a beggar's face at the door, very polite", "the face that opens the door at night"),
        "heart": ("marrow, asked for nicely", "to let the knocking in"),
        "lhand": ("an empty bowl held out", "a latch it has already lifted"),
        "rhand": ("its pride, for asking at all", "the door, wide open"),
        "belly": ("the door staying shut", "whatever is knocking"),
        "feet": ("a road from door to door to door", "a road that leads to its own threshold"),
        "under": ("the Ghauul, knocking for marrow", "a house that answered once"),
    },
    "bell": {
        "brow": ("a face that hears something under the water", "a face that rings true, and shouldn't"),
        "heart": ("a call only the drowned can hear", "a bell rung true, for once"),
        "lhand": ("a clapper wrapped in weed", "a note held perfectly in tune"),
        "rhand": ("the living, out of step", "the silence the bell kept"),
        "belly": ("the bell stopping", "the bell sounding right"),
        "feet": ("the old one's spine, walked in step with the drowned court", "a road that rings under every footfall"),
        "under": ("the drowned king's court, walking", "a drowned bell, in tune at last"),
    },
    "coin": {
        "brow": ("a merchant's smile on a picked-clean face", "the face of a buyer who didn't ask the price"),
        "heart": ("to sell what is left", "to buy, and pay too much"),
        "lhand": ("a coin from the end of the world", "a thing it paid far too much for"),
        "rhand": ("whatever will sell", "the price, gladly"),
        "belly": ("having nothing left to sell", "what it has already paid"),
        "feet": ("the market road along the dead shore", "a road it bought, and paid for twice"),
        "under": ("the merchant who picks the shore clean", "a bargain struck in the dark that isn't finished"),
    },
    "kiln": {
        "brow": ("a face fired hard", "a face with a crack across it"),
        "heart": ("to be hardened by what it goes through", "to break in the fire and be done"),
        "lhand": ("a coal it won't drop", "a shard that broke in the firing"),
        "rhand": ("everything soft in it", "the shape it was meant to have"),
        "belly": ("going in soft and coming out soft", "the crack it can feel spreading"),
        "feet": ("a road through the heat under everything", "a road of broken pots"),
        "under": ("the Deep, setting blood to iron in the dark", "a crack running all the way down"),
    },
    "loom": {
        "brow": ("a face coming undone thread by thread", "a face stitched back together, lumpy"),
        "heart": ("to be unpicked down to the first thread", "to be stitched back together, badly"),
        "lhand": ("a loose thread it keeps pulling", "a knot of thread from somebody else's life"),
        "rhand": ("whatever was woven wrong", "a thread it should have kept"),
        "belly": ("the humming behind the veil", "unravelling all at once"),
        "feet": ("a road that unspools behind it", "a road darned with other people's roads"),
        "under": ("the Crone, picking it out and humming", "a patch that holds, mostly"),
    },
    "lanternwright": {
        "brow": ("a maker's soot-dark face", "a face that looks up as the light goes out"),
        "heart": ("to keep what was lost", "to let go what it kept"),
        "lhand": ("a lantern nobody knows how to make anymore", "an empty lantern with its door open"),
        "rhand": ("nothing, ever, that it can keep", "a breath out of the top of the lantern"),
        "belly": ("the last lantern going dark", "being kept, when it wants to go"),
        "feet": ("the road the hunted makers took", "a road that goes up and out with the light"),
        "under": ("the last maker, hiding something lit", "every soul let out of every lantern"),
    },
    "choir": {
        "brow": ("a mouth open on a note that never ends", "a face holding its breath"),
        "heart": ("to hold on past all breath", "the silence between notes"),
        "lhand": ("a note it will not let go of", "a breath it has been saving"),
        "rhand": ("its own voice, into the stone", "the note, at last"),
        "belly": ("the note ending", "what comes in the quiet"),
        "feet": ("the low wet roads under the crypts, humming", "a road with no sound on it at all"),
        "under": ("the Drowned Choir, still holding the note", "the rest the singers are afraid of"),
    },
    "tithe": {
        "brow": ("a debtor's lowered face", "a polite face at the door at night"),
        "heart": ("to be paid up, and free", "everything, not just its share"),
        "lhand": ("a debt nobody remembers taking", "a ledger with its name in it"),
        "rhand": ("its share of everything, every time", "its patience, waiting to be paid"),
        "belly": ("the knock", "a debtor who cannot pay"),
        "feet": ("a road paved with what was paid", "the collector's road, walked at night"),
        "under": ("a loan from whatever gave them the mourning", "the one who comes to collect"),
    },
    "crown": {
        "brow": ("a hollow crown giving orders to the wind", "a face waiting to be told what to do"),
        "heart": ("to be obeyed, just once", "to obey, and have nothing left to obey with"),
        "lhand": ("an order no one will carry out", "the keys of an empty city"),
        "rhand": ("the crown, though it never fit", "its last order, into the silence"),
        "belly": ("nobody listening", "an order it can't keep"),
        "feet": ("a road toward the brown moon", "the empty streets of the city that would obey"),
        "under": ("the Man in the Rust, still giving orders", "an empty city, waiting for a voice"),
    },
}


# what each card does in each place, upright and reversed: the hidden effects (Derek, 2026-10-10: "the cards should also
# offer resistance + and - to the element types in the game, fire, miasma, magic etc"; "feels like we get more positive
# than negative, should be balanced"). Every card in every place both gives and takes: upright it leans a little to the
# good, reversed it takes more than it gives, so that a whole hand (the calling's own card included) comes out about
# even (tools/reading/balance_check.py simulates it). Only keys the game applies (core/hero_stats.gd, entities/):
# the resistances are res (magic), res_fire, res_cold and res_poison (shown as miasma). Each step keeps to the law
# (docs/wiki/01: every percent effect 1% at most; attributes 2, armour and poise 4, life per kill 1; life and the
# calling's own resource 10). Worth of a step: data/reading.json "value" x the step.
STEP = {"vit": 2, "spi": 2, "con": 2, "armor": 4, "stam": 4, "lok": 1, "life": 10, "mana": 10}
PLACE_KEYS = {
    "brow": ["res", "armor", "stam", "lrad", "mf", "res_fire", "res_cold"],
    "heart": ["dmg", "xp", "gold", "mf", "fcr", "spi", "raised"],
    "lhand": ["armor", "con", "lok", "potion", "res_poison", "raised", "res_fire"],
    "rhand": ["frw", "gold", "xp", "regen", "potion", "hpPct", "res"],
    "belly": ["res_fire", "res_cold", "res_poison", "res", "hpPct", "vit"],
    "feet": ["frw", "stam", "lrad", "dmg_day", "dmg_night", "res_cold"],
    "under": ["vit", "spi", "con", "life", "mana", "hpPct", "dmg", "res"],
}
ASPECT_KEYS = {
    "bone": ["con", "armor", "raised", "res_cold"],
    "flesh": ["vit", "life", "hpPct", "res_poison"],
    "soul": ["spi", "res", "fcr", "mana"],
    "breath": ["regen", "frw", "res_poison", "lrad"],
    "silence": ["dmg_night", "res", "mf", "stam"],
}
RESISTS = ["res", "res_fire", "res_cold", "res_poison"]
UP_LEAN = 0.10           # upright: worth given minus worth taken
REV_LEAN = 0.95          # reversed: worth taken minus worth given


def _pair(rng, gives, takes, lean, worth):
    """the give and the take whose worths differ by nearest the lean (a few near-best, picked among by the card)"""
    best = []
    for g in gives:
        for t in takes:
            if g == t:
                continue
            best.append((abs(worth(g) - worth(t) - lean), g, t))
    best.sort()
    near = [b for b in best if b[0] <= best[0][0] + 0.15][:12]
    _, g, t = near[rng.randrange(len(near))]
    return g, t


def card_fx(mid, aspect, value):
    import zlib, random
    worth = lambda k: float(value.get(k, 0.0)) * STEP.get(k, 1)
    out = {}
    for pid, keys in PLACE_KEYS.items():
        rng = random.Random(zlib.crc32(("%s|%s" % (mid, pid)).encode()))
        pool = list(dict.fromkeys(keys + ASPECT_KEYS[aspect]))
        # the belly is where the fears sit: one of its two always a resistance (in the other place too, now and then)
        g, t = _pair(rng, pool, keys, UP_LEAN, worth)
        if pid == "belly" and g not in RESISTS and t not in RESISTS:
            g, t = _pair(rng, pool, RESISTS, UP_LEAN, worth)
        tg, tt = _pair(rng, keys, pool, -REV_LEAN, worth)
        if pid == "belly" and tg not in RESISTS and tt not in RESISTS:
            tg, tt = _pair(rng, RESISTS, pool, -REV_LEAN, worth)
        out[pid] = [{g: STEP.get(g, 1), t: -STEP.get(t, 1)}, {tg: STEP.get(tg, 1), tt: -STEP.get(tt, 1)}]
    return out


def main():
    with open(os.path.join(ROOT, "data", "reading.json"), encoding="utf-8") as fh:
        value = json.load(fh).get("value", {})
    ms = []
    for (i, a, o, r, w, sy, sr) in M:
        st = STORY.get(i)
        assert i in MEANS and len(MEANS[i]) == 7, i
        ms.append(dict(id=i, aspect=a, one=o, rev=r, wears=w, say=st[0] if st else sy, say_rev=st[1] if st else sr,
                       gist=st[2] if st else o, gist_rev=st[3] if st else r,
                       mean={k: list(v) for k, v in MEANS[i].items()}, fx=card_fx(i, a, value)))
    d = dict(places=PLACES, weave=WEAVE, open=OPEN, shapes=SHAPES, close=CLOSE, aspect_word=ASPECT_WORD, read=READ,
             deck_open=DECK_OPEN, drawn=DRAWN, drawn_rev=DRAWN_REV, close_sum=CLOSE_SUM, tale=TALE,
             tale_order=TALE_ORDER, on=ON, deal=DEAL, turned=TURNED,
             calling=CALLING, calling_name=CALLING_NAME, mantles=ms)
    p = os.path.join(ROOT, "data", "reading_spread.json")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("wrote", p, len(ms), "mantles")


if __name__ == "__main__":
    main()
