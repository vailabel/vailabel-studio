interface Point {
  x: number;
  y: number;
}

interface Label {
  id: string;
  name: string;
  type: "box" | "polygon";
  coordinates: Point[];
}
