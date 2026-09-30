/* Edit this file: your details, showreel and projects. No other file needs touching to add work. */
window.SITE = {
  name: "Your Name",
  role: "VFX & Film Student",
  place: "United Kingdom",
  email: "hello@yourname.com",
  showreel: "https://vimeo.com/76979871",   // any Vimeo link (private links with a hash work too)
  socials: [
    { label: "Vimeo", url: "https://vimeo.com/" },
    { label: "LinkedIn", url: "https://linkedin.com/" },
    { label: "Instagram", url: "https://instagram.com/" }
  ],
  about: [
    "Write two or three short paragraphs here about who you are, what you study, and the kind of work you want to make.",
    "Mention your course, university, and the areas you focus on, such as compositing, FX, or cinematography."
  ],
  skills: ["Compositing", "Nuke", "Houdini", "Blender", "DaVinci Resolve", "After Effects"]
};

window.PROJECTS = [
  { slug: "project-one", title: "Project One", year: "2026", role: "Compositor", type: "Short film",
    vimeo: "https://vimeo.com/76979871", image: "", // e.g. "assets/project-one.jpg"
    summary: "One or two sentences that describe the project and what you did on it.",
    body: ["A longer description of the brief, your process, and the problems you solved."],
    tools: ["Nuke", "Blender"], credits: ["Director: Name", "Compositor: You"] },
  { slug: "project-two", title: "Project Two", year: "2025", role: "FX Artist", type: "Personal project",
    vimeo: "", image: "", summary: "A short summary for the project card.",
    body: ["More detail about the project."], tools: ["Houdini"], credits: [] },
  { slug: "project-three", title: "Project Three", year: "2025", role: "Cinematographer", type: "Group project",
    vimeo: "", image: "", summary: "A short summary for the project card.",
    body: ["More detail about the project."], tools: ["DaVinci Resolve"], credits: [] }
];
