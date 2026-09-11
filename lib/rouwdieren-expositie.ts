// Fixed dataset from the graduation exposition: eighteen rouwdieren that this
// landscape always shows, rather than letting visitors add their own. Texts
// are written from participants' own words and checked by the researcher —
// keep them exactly as given, do not rewrite, shorten or regenerate.
export const EXPOSITIE_LANDSCHAP_ID = "expositie";

export type ExpositieRouwdier = {
  id: string;
  title: string;
  text: string;
};

export const expositieRouwdieren: ExpositieRouwdier[] = [
  { id: "rainbow", title: "Rainbow", text: "At the funeral a song about a rainbow was played. The rainbow has kept coming back ever since, and now it is one with her." },
  { id: "house-on-a-star", title: "House on a star", text: "In my head my niece lives in a little house on a star. That is where my rouwdier would want to live." },
  { id: "speck", title: "Speck", text: "My rouwdier does not flood me any more. It has become small and far away, a speck in the sea beyond the dunes, but it is always there and still needs to be looked after sometimes." },
  { id: "psalm-23", title: "Psalm 23", text: "When I hear or read this psalm, I feel my grandmother. The love for her comes back in those words, and after it the peace that she is in a good place now." },
  { id: "collective-peace", title: "Collective peace", text: "When I am with my family and thinks about death, there is a peace that belongs to all of them together. It was okey this way, although it was sad, but those also belong with each other." },
  { id: "guardian-angel", title: "Guardian angel", text: "I was twelve when my grandmother died, and my father said that grandma was my guardian angel now. Sometimes it still crosses my mind: maybe she can see me. In the beginning the rouwdier was almost everything, and after that it slowly became less present." },
  { id: "little-mouse", title: "Little mouse", text: "Little mouse is what my grandfather used to call me. This stayed with me: it squeaks up now and then, small but good." },
  { id: "white-butterfly", title: "White butterfly", text: "There was a white butterfly, during my grandmother's funeral. Now it often appears around her things, free and beyond reach, and still close to the people I love." },
  { id: "wounded-bird", title: "Wounded bird", text: "A wounded bird that is allowed to fly again after a while, but keeping the scar. The wound troubles me less and less, I have to land at an odd moment sometimes, but I can stay up in the air longer every time." },
  { id: "my-own-rouwdier", title: "My own rouwdier", text: "I am my own rouwdier, floating between acceptance and helplessness, because in the end I am the one who experiences the grief. Accompanied by many feeling such as: guilt, sorrow, comfort, love and melancholy." },
  { id: "grandmothers-bed", title: "Grandmother's bed", text: "The bed in Vietnam I played on as a child with my cousins. It still stands at the centre of her old house, and the small children who never knew her play on it now." },
  { id: "wat-een-stunt", title: "Wat een stunt", text: "My pake always said it, what a stunt. Me and my mother still say it to each other, with it being reminded of him." },
  { id: "the-parakeet", title: "The parakeet", text: "After my great grandfather's funeral a budgie landed on my grandfather's shoulder. The bird stayed, became their parakeet, and has remained a sign of him." },
  { id: "two-sisters", title: "Two sisters", text: "When I am having a good time with someone's brother or sister, I think of the two sisters I could have had. They weren't allowed to live, and that absence will remain in my life." },
  { id: "marble", title: "Marble", text: "Grief feels like a marble rolling through my body. Sometimes it sits in your stomach, in your head, in your hands or you don't feel it at all. It could also be on your tongue, accompanied by a need to talk about it." },
  { id: "photo-frame", title: "Photo frame", text: "My grandfather was very old and had dementia, and that is how I partly remember him, asking where he was. In the photo frame he still comes across as strong, and that is where he lives: in my memory, caught by a frame." },
  { id: "everywhere-i-am", title: "Everywhere I am", text: "Wherever I am, my rouwdier is as well. In my mother's family people celebrated things too early for me. Maybe the rouwdier is allowed to be in mourning for a while too." },
  { id: "forest-creature", title: "Forest creature", text: "Half in life and half outside it, floating. When it touches the ground with two feet I know I have to follow it, towards quiet, coolness and nature, and when it has had enough attention it sinks back into the background." },
];
