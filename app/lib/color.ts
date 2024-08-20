const COLOR_NAMES = [
  "dark",
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
];
const COLOR_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const BRIGHT_COLORS = {
  names: COLOR_NAMES.slice(2),
  levels: COLOR_LEVELS.slice(4),
};

export function getRandomColor() {
  const randomColor = Math.floor(Math.random() * BRIGHT_COLORS.names.length);
  const randomLevel = Math.floor(Math.random() * BRIGHT_COLORS.levels.length);

  return `${BRIGHT_COLORS.names[randomColor]}.${BRIGHT_COLORS.levels[randomLevel]}`;
}
