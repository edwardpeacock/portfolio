/* Edit this file: your details, showreel and projects. No other file needs touching to add work. */
window.SITE = {
  name: "Edward Peacock",
  role: "VFX Artist & Compositor",
  place: "United Kingdom",
  email: "epeacockvfx@gmail.com",
  showreel: "https://vimeo.com/1228910959",   // any Vimeo link (private links with a hash work too)
  showreelLoop: "assets/showreel-loop.mp4",   // silent looping clip shown on the home page; clicking play opens the Vimeo showreel above
  socials: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/edwardpeacock/" },
    { label: "Instagram", url: "https://www.instagram.com/epeacock.vfx/" }
  ],
  about: [
    "I’m a VFX Artist studying The Art of Visual Effects at Escape Studios. I have dedicated the past 6 years to learning and understanding how to create high quality VFX.",
    "This involved delving deep into 2D compositing, practicing the 2D VFX pipeline whilst working with industry standard software and always thinking professionally. I also have experience in the 3D pipeline, from modelling to UV unwrapping and texturing.",
    "I love photography trips around the UK, and have a passion for capturing the hidden beauty that lies in the most unexpected places!"
  ],
  skills: ["Nuke", "Blender", "Autodesk Maya", "3DEqualizer", "SynthEyes", "DaVinci Resolve", "EmberGen", "After Effects"]
};

window.PROJECTS = [
  { slug: "gramophone-vfx-shot", title: "Gramophone VFX Shot", year: "2025",
    tags: ["CG Integration", "Set Extension"],
    vimeo: "https://vimeo.com/1228911972", image: "", // e.g. "assets/gramophone.jpg"
    body: ["I created a gramophone 3D model and composited it onto a pub table. Using Nuke, Maya, Substance Painter, and 3DEqualizer! I recreated reflections on the table, the wall and faked the glass to make it appear refractive."],
    tools: [], credits: [],
    // Fallback only: the real list is read from assets/breakdowns/gramophone-vfx-shot/README.txt (edit that file to rename / reorder / add steps). This list is used only if the README cannot be read.
    breakdown: [
      { label: "Original plate", file: "01-original-plate" },
      { label: "Camera track", file: "02-camera-track" },
      { label: "3D gramophone", file: "03-3d-gramophone" },
      { label: "Reflections", file: "04-reflections" },
      { label: "Glass refraction", file: "05-glass-refraction" },
      { label: "Final composite", file: "06-final-composite" }
    ] },
  { slug: "blazing-escape", title: "Blazing Escape", year: "2026",
    tags: ["CG Environment"],
    vimeo: "https://vimeo.com/1176311946", image: "",
    body: ["Blazing Escape was a concept inspired by the Mandalorian and Grogu (2026). For this project I learnt EmberGen to simulate smoke trails and explored a modelling technique by Dylan Neill to create a seemingly never ending ocean. Mountain and rock assets were sourced from FAB, the spaceship is from BigMediumSmall. (<a href='https://www.bigmediumsmall.com/modelshop-greebles' target='_blank' rel='noopener'>https://www.bigmediumsmall.com/modelshop-greebles</a>)"],
    tools: [], credits: [],
    // Fallback only: the real list is read from assets/breakdowns/blazing-escape/README.txt (edit that file to rename / reorder / add steps). This list is used only if the README cannot be read.
    breakdown: [
      { label: "Ocean", file: "01-ocean" },
      { label: "Mountains and rocks", file: "02-mountains-and-rocks" },
      { label: "Spaceship", file: "03-spaceship" },
      { label: "Smoke trails", file: "04-smoke-trails" },
      { label: "Final composite", file: "05-final-composite" }
    ] },
  { slug: "alien-cube", title: "Alien Cube", year: "2026",
    tags: ["Personal project", "CG Integration"],
    vimeo: "https://vimeo.com/1201158953", image: "",
    body: ["This personal project was experimentation with tracking and rigid body simulations. In addition I wanted to test a workflow involving fixing problems in compositing without relying on backtracking to 3D."],
    tools: [], credits: [],
    // Fallback only: the real list is read from assets/breakdowns/alien-cube/README.txt (edit that file to rename / reorder / add steps). This list is used only if the README cannot be read.
    breakdown: [
      { label: "Original plate", file: "01-original-plate" },
      { label: "Tracking", file: "02-tracking" },
      { label: "Alien cube", file: "03-alien-cube" },
      { label: "Rigid body simulation", file: "04-rigid-body-simulation" },
      { label: "Comp fixes", file: "05-comp-fixes" },
      { label: "Final composite", file: "06-final-composite" }
    ] },
  { slug: "millennium-vfx-shot", title: "Millennium VFX Shot", year: "2025",
    tags: ["Set Extension", "Cleanup", "CG Integration"],
    vimeo: "https://vimeo.com/1176617846", image: "",
    body: ["This first year university project was primarily focused on compositing. It involved multiple CG rebuilds and set extensions. All students were provided with CG barbed wire and CCTV camera; however I had more ideas and rendered my own CG from Blender. Integration was done by precise grading and took many iterations."],
    tools: [], credits: [],
    // Fallback only: the real list is read from assets/breakdowns/millennium-vfx-shot/README.txt (edit that file to rename / reorder / add steps). This list is used only if the README cannot be read.
    breakdown: [
      { label: "Original plate", file: "01-original-plate" },
      { label: "Set extension", file: "02-set-extension" },
      { label: "Wall", file: "03-barewall" },
      { label: "Graffiti", file: "04-graffiti-plain" },
      { label: "Imperfections", file: "05-graffiti-wall-final" },
      { label: "Raw CG", file: "06-cg-raw" },
      { label: "Final Output", file: "07-my-cg-graded" }
    ] },
  { slug: "boxer-rotoscope", title: "Boxer Rotoscope", year: "2026",
    tags: ["Rotoscoping"],
    vimeo: "https://vimeo.com/1232643933", image: "",
    body: [],   // add a description here, e.g. ["What the shot was and how you approached it."]. Left empty, the Description section is hidden.
    tools: [], credits: [],
    breakdown: [] }
];
