import { Coordinate } from '../types/simulation'

export interface RawParcel {
  id: number
  label: string
  crop: string
  applicationRateLHa: number
  polygon: Coordinate[]
  exclusions: {
    id: string
    label: string
    polygon: Coordinate[]
  }[]
}

export const sampleParcels: RawParcel[] = [
  {
    id: 0,
    label: 'North Orchard Block',
    crop: 'Corn',
    applicationRateLHa: 112,
    polygon: [
      { lng: -88.6468, lat: 40.1195 },
      { lng: -88.6426, lat: 40.1201 },
      { lng: -88.6411, lat: 40.1178 },
      { lng: -88.6424, lat: 40.1143 },
      { lng: -88.6474, lat: 40.1148 },
      { lng: -88.6482, lat: 40.1172 },
    ],
    exclusions: [
      {
        id: 'north-pond',
        label: 'Retention Pond',
        polygon: [
          { lng: -88.6462, lat: 40.1183 },
          { lng: -88.6452, lat: 40.1184 },
          { lng: -88.6450, lat: 40.1174 },
          { lng: -88.6460, lat: 40.1172 },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Center Terrace',
    crop: 'Soybeans',
    applicationRateLHa: 96,
    polygon: [
      { lng: -88.6406, lat: 40.1189 },
      { lng: -88.6362, lat: 40.1191 },
      { lng: -88.6349, lat: 40.1165 },
      { lng: -88.6358, lat: 40.1129 },
      { lng: -88.6408, lat: 40.1131 },
      { lng: -88.6416, lat: 40.1161 },
    ],
    exclusions: [
      {
        id: 'center-yard',
        label: 'Equipment Yard',
        polygon: [
          { lng: -88.6392, lat: 40.1168 },
          { lng: -88.6377, lat: 40.1168 },
          { lng: -88.6377, lat: 40.1153 },
          { lng: -88.6390, lat: 40.1152 },
        ],
      },
      {
        id: 'center-buffer',
        label: 'Windbreak Buffer',
        polygon: [
          { lng: -88.6369, lat: 40.1146 },
          { lng: -88.6362, lat: 40.1147 },
          { lng: -88.6362, lat: 40.1135 },
          { lng: -88.6368, lat: 40.1134 },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'South Pivot Edge',
    crop: 'Winter Wheat',
    applicationRateLHa: 88,
    polygon: [
      { lng: -88.6454, lat: 40.1113 },
      { lng: -88.6388, lat: 40.1117 },
      { lng: -88.6368, lat: 40.1089 },
      { lng: -88.6380, lat: 40.1053 },
      { lng: -88.6442, lat: 40.1047 },
      { lng: -88.6465, lat: 40.1071 },
    ],
    exclusions: [
      {
        id: 'south-trees',
        label: 'Tree Stand',
        polygon: [
          { lng: -88.6439, lat: 40.1094 },
          { lng: -88.6429, lat: 40.1093 },
          { lng: -88.6427, lat: 40.1082 },
          { lng: -88.6437, lat: 40.1080 },
        ],
      },
    ],
  },
]
