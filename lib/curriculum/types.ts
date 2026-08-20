export type Area = {
  id: number;
  code: string;
  name: string;
  shortName: string;
  isTransversal: boolean;
  hoursPerWeek: number;
  colorKey: string;
  order: number;
};

export type Competency = {
  id: number;
  areaId: number;
  code: string;
  name: string;
  order: number;
};

export type Curriculum = {
  areas: Area[];
  competencies: Competency[];
};
