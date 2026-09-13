// Fixed dataset from the graduation exposition: eighteen rouwdieren that this
// landscape always shows, rather than letting visitors add their own. Texts
// are written from participants' own words and checked by the researcher —
// keep them exactly as given, do not rewrite, shorten or regenerate.
export const EXPOSITIE_LANDSCHAP_ID = "expositie";

export type ExpositieRouwdier = {
  id: string;
  title: string;
  text: string;
  status?: "visible" | "hidden";
};

export const expositieRouwdieren: ExpositieRouwdier[] = [
  { id: "rainbow", title: "Regenboog", text: "Op de uitvaart werd een nummer over de regenboog gedraaid. Sindsdien komt de regenboog steeds terug, en nu is hij één met haar." },
  { id: "house-on-a-star", title: "Huisje op de ster", text: "In mijn hoofd zit mijn nichtje in een huisje op een ster. Daar zou mijn rouwdier willen wonen.", status: "hidden" },
  { id: "speck", title: "Stipje", text: "Mijn rouwdier overspoelt me niet meer. Het is klein en ver weg geworden, een stipje in de zee achter de duinen, maar het is er altijd en heeft soms nog iets van zorg nodig." },
  { id: "psalm-23", title: "Psalm 23", text: "Als ik deze psalm hoor of lees, voel ik mijn oma. In die woorden komt de liefde voor haar terug, en daarna de vrede dat ze nu op een mooie plek is." },
  { id: "collective-peace", title: "Collectieve vrede", text: "Als ik bij mijn familie ben en aan de dood denk, is er een vrede die van ons allemaal samen is. Het was goed zo, al was het verdrietig, en die twee horen ook bij elkaar." },
  { id: "guardian-angel", title: "Beschermengeltje", text: "Ik was twaalf toen mijn oma overleed, en mijn vader zei dat oma nu mijn beschermengel was. Soms schiet dat nog steeds door mijn hoofd: misschien ziet ze me wel. In het begin was het rouwdier bijna alles, daarna werd het langzaam minder aanwezig." },
  { id: "little-mouse", title: "Muisje", text: "Muisje noemde mijn opa me vroeger. Dat is bij me gebleven: het piept af en toe op, klein maar fijn." },
  { id: "white-butterfly", title: "Witte vlinder", text: "Er was een witte vlinder, tijdens de begrafenis van mijn oma. Nu verschijnt hij vaak rond haar spullen, vrij en ongrijpbaar, en toch dicht bij de mensen van wie ik houd." },
  { id: "wounded-bird", title: "Gewonde vogel", text: "Een gewonde vogel die na een tijd weer mag vliegen, maar het litteken houdt. De wond hindert me steeds minder, ik moet soms landen op een raar moment, maar ik blijf elke keer langer in de lucht." },
  { id: "my-own-rouwdier", title: "Mijn eigen rouwdier", text: "Ik ben mijn eigen rouwdier, zwevend tussen acceptatie en hulpeloosheid, want uiteindelijk ben ik degene die de rouw ervaart. Met daarbij een heleboel gevoelens, zoals schuld, verdriet, troost, liefde en melancholie." },
  { id: "grandmothers-bed", title: "Oma's bed", text: "Het bed in Vietnam waar ik als kind met mijn neefjes en nichtjes op speelde. Het staat nog steeds centraal in haar oude huis, en de kleine kinderen die haar nooit gekend hebben spelen er nu op." },
  { id: "wat-een-stunt", title: "Wat een stunt", text: "Mijn pake zei het altijd, wat een stunt. Mijn moeder en ik zeggen het nog steeds tegen elkaar, en dan denken we even aan hem." },
  { id: "the-parakeet", title: "De parkiet", text: "Na de begrafenis van mijn overgrootopa kwam er een parkiet op de schouder van mijn opa zitten. De vogel bleef, werd onze parkiet, en is een teken van hem gebleven." },
  { id: "two-sisters", title: "Twee zussen", text: "Als ik het gezellig heb met iemands broer of zus, denk ik aan de twee zussen die ik had kunnen hebben. Zij mochten niet leven, en dat gemis blijft in mijn leven." },
  { id: "marble", title: "Knikker", text: "Rouw voelt als een knikker die door mijn lichaam rolt. Soms zit hij in je buik, in je hoofd, in je handen, of voel je hem helemaal niet. Hij kan ook op je tong liggen, met de behoefte om erover te praten." },
  { id: "photo-frame", title: "Fotolijstje", text: "Mijn opa was heel oud en dement, en zo herinner ik hem me ook deels, vragend waar hij was. In het fotolijstje komt hij nog krachtig over, en daar leeft hij: in mijn herinnering, gevangen door een lijstje." },
  { id: "everywhere-i-am", title: "Overal waar ik ben", text: "Overal waar ik ben, is mijn rouwdier ook. In de familie van mijn moeder werd er te vroeg weer gevierd voor mijn gevoel. Misschien mag het rouwdier ook even in rouw zijn." },
  { id: "forest-creature", title: "Boswezen", text: "Half in het leven en half erbuiten, zwevend. Als het met twee poten de grond raakt weet ik dat ik het moet volgen, naar rust, koelte en natuur, en als het genoeg aandacht heeft gehad zakt het weer naar de achtergrond." },
];
