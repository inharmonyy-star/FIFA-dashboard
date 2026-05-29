import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";

// Time zones:
//   Cyprus  EEST = UTC+3
//   Mexico  CDT  = UTC-5  (Mexico City during summer)
//   Offset: Cyprus is +8h ahead of Mexico City

const ALL_TEAMS = [
  "Mexico","South Africa","South Korea","Czechia","Canada","Bosnia & Herzegovina",
  "USA","Paraguay","Qatar","Switzerland","Brazil","Morocco","Haiti","Scotland",
  "Australia","Türkiye","Germany","Curaçao","Netherlands","Japan","Ivory Coast",
  "Ecuador","Sweden","Tunisia","Spain","Cape Verde","Belgium","Egypt","Saudi Arabia",
  "Uruguay","Iran","New Zealand","France","Senegal","Iraq","Norway","Argentina",
  "Algeria","Austria","Jordan","Portugal","DR Congo","England","Croatia","Ghana",
  "Panama","Uzbekistan","Colombia",
];

// timeCY = Cyprus EEST, timeMX = Mexico City CDT
// MX is Cyprus − 8h
const ALL_MATCHES = [
  { id:1,   stage:"Group A",      date:"2026-06-11", timeCY:"22:00",      timeMX:"14:00",      home:"Mexico",               away:"South Africa",         venue:"Estadio Azteca, Mexico City" },
  { id:2,   stage:"Group A",      date:"2026-06-12", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"South Korea",           away:"Czechia",              venue:"Estadio Akron, Zapopan" },
  { id:3,   stage:"Group B",      date:"2026-06-12", timeCY:"22:00",      timeMX:"14:00",      home:"Canada",               away:"Bosnia & Herzegovina", venue:"BMO Field, Toronto" },
  { id:4,   stage:"Group D",      date:"2026-06-13", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"USA",                  away:"Paraguay",             venue:"SoFi Stadium, Inglewood" },
  { id:5,   stage:"Group B",      date:"2026-06-13", timeCY:"22:00",      timeMX:"14:00",      home:"Qatar",                away:"Switzerland",          venue:"Levi's Stadium, Santa Clara" },
  { id:6,   stage:"Group C",      date:"2026-06-14", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Brazil",               away:"Morocco",              venue:"MetLife Stadium, East Rutherford" },
  { id:7,   stage:"Group C",      date:"2026-06-14", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Haiti",                away:"Scotland",             venue:"Gillette Stadium, Foxborough" },
  { id:8,   stage:"Group D",      date:"2026-06-14", timeCY:"07:00",      timeMX:"23:00 (-1)", home:"Australia",            away:"Türkiye",              venue:"BC Place, Vancouver" },
  { id:9,   stage:"Group E",      date:"2026-06-14", timeCY:"20:00",      timeMX:"12:00",      home:"Germany",              away:"Curaçao",              venue:"NRG Stadium, Houston" },
  { id:10,  stage:"Group F",      date:"2026-06-14", timeCY:"23:00",      timeMX:"15:00",      home:"Netherlands",          away:"Japan",                venue:"AT&T Stadium, Arlington" },
  { id:11,  stage:"Group E",      date:"2026-06-15", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Ivory Coast",          away:"Ecuador",              venue:"Lincoln Financial Field, Philadelphia" },
  { id:12,  stage:"Group F",      date:"2026-06-15", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Sweden",               away:"Tunisia",              venue:"Estadio BBVA, Monterrey" },
  { id:13,  stage:"Group H",      date:"2026-06-15", timeCY:"19:00",      timeMX:"11:00",      home:"Spain",                away:"Cape Verde",           venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:14,  stage:"Group G",      date:"2026-06-15", timeCY:"22:00",      timeMX:"14:00",      home:"Belgium",              away:"Egypt",                venue:"Lumen Field, Seattle" },
  { id:15,  stage:"Group H",      date:"2026-06-16", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Saudi Arabia",         away:"Uruguay",              venue:"Hard Rock Stadium, Miami Gardens" },
  { id:16,  stage:"Group G",      date:"2026-06-16", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Iran",                 away:"New Zealand",          venue:"SoFi Stadium, Inglewood" },
  { id:17,  stage:"Group I",      date:"2026-06-16", timeCY:"22:00",      timeMX:"14:00",      home:"France",               away:"Senegal",              venue:"MetLife Stadium, East Rutherford" },
  { id:18,  stage:"Group I",      date:"2026-06-17", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Iraq",                 away:"Norway",               venue:"Gillette Stadium, Foxborough" },
  { id:19,  stage:"Group J",      date:"2026-06-17", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Argentina",            away:"Algeria",              venue:"Arrowhead Stadium, Kansas City" },
  { id:20,  stage:"Group J",      date:"2026-06-17", timeCY:"07:00",      timeMX:"23:00 (-1)", home:"Austria",              away:"Jordan",               venue:"Levi's Stadium, Santa Clara" },
  { id:21,  stage:"Group K",      date:"2026-06-17", timeCY:"20:00",      timeMX:"12:00",      home:"Portugal",             away:"DR Congo",             venue:"NRG Stadium, Houston" },
  { id:22,  stage:"Group L",      date:"2026-06-17", timeCY:"23:00",      timeMX:"15:00",      home:"England",              away:"Croatia",              venue:"AT&T Stadium, Arlington" },
  { id:23,  stage:"Group L",      date:"2026-06-18", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Ghana",                away:"Panama",               venue:"BMO Field, Toronto" },
  { id:24,  stage:"Group K",      date:"2026-06-18", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Uzbekistan",           away:"Colombia",             venue:"Estadio Azteca, Mexico City" },
  { id:25,  stage:"Group A",      date:"2026-06-18", timeCY:"19:00",      timeMX:"11:00",      home:"Czechia",              away:"South Africa",         venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:26,  stage:"Group B",      date:"2026-06-18", timeCY:"22:00",      timeMX:"14:00",      home:"Switzerland",          away:"Bosnia & Herzegovina", venue:"SoFi Stadium, Inglewood" },
  { id:27,  stage:"Group B",      date:"2026-06-19", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Canada",               away:"Qatar",                venue:"BC Place, Vancouver" },
  { id:28,  stage:"Group A",      date:"2026-06-19", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Mexico",               away:"South Korea",          venue:"Estadio Akron, Zapopan" },
  { id:29,  stage:"Group D",      date:"2026-06-19", timeCY:"22:00",      timeMX:"14:00",      home:"USA",                  away:"Australia",            venue:"Lumen Field, Seattle" },
  { id:30,  stage:"Group C",      date:"2026-06-20", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Scotland",             away:"Morocco",              venue:"Gillette Stadium, Foxborough" },
  { id:31,  stage:"Group C",      date:"2026-06-20", timeCY:"03:30 (+1)", timeMX:"19:30",      home:"Brazil",               away:"Haiti",                venue:"Lincoln Financial Field, Philadelphia" },
  { id:32,  stage:"Group D",      date:"2026-06-20", timeCY:"06:00 (+1)", timeMX:"22:00",      home:"Türkiye",              away:"Paraguay",             venue:"Levi's Stadium, Santa Clara" },
  { id:33,  stage:"Group F",      date:"2026-06-20", timeCY:"20:00",      timeMX:"12:00",      home:"Netherlands",          away:"Sweden",               venue:"NRG Stadium, Houston" },
  { id:34,  stage:"Group E",      date:"2026-06-20", timeCY:"23:00",      timeMX:"15:00",      home:"Germany",              away:"Ivory Coast",          venue:"BMO Field, Toronto" },
  { id:35,  stage:"Group E",      date:"2026-06-21", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Ecuador",              away:"Curaçao",              venue:"Arrowhead Stadium, Kansas City" },
  { id:36,  stage:"Group F",      date:"2026-06-21", timeCY:"07:00",      timeMX:"23:00 (-1)", home:"Tunisia",              away:"Japan",                venue:"Estadio BBVA, Monterrey" },
  { id:37,  stage:"Group H",      date:"2026-06-21", timeCY:"19:00",      timeMX:"11:00",      home:"Spain",                away:"Saudi Arabia",         venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:38,  stage:"Group G",      date:"2026-06-21", timeCY:"22:00",      timeMX:"14:00",      home:"Belgium",              away:"Iran",                 venue:"SoFi Stadium, Inglewood" },
  { id:39,  stage:"Group H",      date:"2026-06-22", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Uruguay",              away:"Cape Verde",           venue:"Hard Rock Stadium, Miami Gardens" },
  { id:40,  stage:"Group G",      date:"2026-06-22", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"New Zealand",          away:"Egypt",                venue:"BC Place, Vancouver" },
  { id:41,  stage:"Group J",      date:"2026-06-22", timeCY:"20:00",      timeMX:"12:00",      home:"Argentina",            away:"Austria",              venue:"AT&T Stadium, Arlington" },
  { id:42,  stage:"Group I",      date:"2026-06-23", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"France",               away:"Iraq",                 venue:"Lincoln Financial Field, Philadelphia" },
  { id:43,  stage:"Group I",      date:"2026-06-23", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Norway",               away:"Senegal",              venue:"MetLife Stadium, East Rutherford" },
  { id:44,  stage:"Group J",      date:"2026-06-23", timeCY:"06:00 (+1)", timeMX:"22:00",      home:"Jordan",               away:"Algeria",              venue:"Levi's Stadium, Santa Clara" },
  { id:45,  stage:"Group K",      date:"2026-06-23", timeCY:"20:00",      timeMX:"12:00",      home:"Portugal",             away:"Uzbekistan",           venue:"NRG Stadium, Houston" },
  { id:46,  stage:"Group L",      date:"2026-06-23", timeCY:"23:00",      timeMX:"15:00",      home:"England",              away:"Ghana",                venue:"Gillette Stadium, Foxborough" },
  { id:47,  stage:"Group L",      date:"2026-06-24", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Panama",               away:"Croatia",              venue:"BMO Field, Toronto" },
  { id:48,  stage:"Group K",      date:"2026-06-24", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Colombia",             away:"DR Congo",             venue:"Estadio Akron, Zapopan" },
  { id:49,  stage:"Group B",      date:"2026-06-24", timeCY:"22:00",      timeMX:"14:00",      home:"Switzerland",          away:"Canada",               venue:"BC Place, Vancouver" },
  { id:50,  stage:"Group B",      date:"2026-06-24", timeCY:"22:00",      timeMX:"14:00",      home:"Bosnia & Herzegovina", away:"Qatar",                venue:"Lumen Field, Seattle" },
  { id:51,  stage:"Group C",      date:"2026-06-25", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Scotland",             away:"Brazil",               venue:"Hard Rock Stadium, Miami Gardens" },
  { id:52,  stage:"Group C",      date:"2026-06-25", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Morocco",              away:"Haiti",                venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:53,  stage:"Group A",      date:"2026-06-25", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Czechia",              away:"Mexico",               venue:"Estadio Azteca, Mexico City" },
  { id:54,  stage:"Group A",      date:"2026-06-25", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"South Africa",         away:"South Korea",          venue:"Estadio BBVA, Monterrey" },
  { id:55,  stage:"Group E",      date:"2026-06-25", timeCY:"23:00",      timeMX:"15:00",      home:"Curaçao",              away:"Ivory Coast",          venue:"Lincoln Financial Field, Philadelphia" },
  { id:56,  stage:"Group E",      date:"2026-06-25", timeCY:"23:00",      timeMX:"15:00",      home:"Ecuador",              away:"Germany",              venue:"MetLife Stadium, East Rutherford" },
  { id:57,  stage:"Group F",      date:"2026-06-26", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Japan",                away:"Sweden",               venue:"AT&T Stadium, Arlington" },
  { id:58,  stage:"Group F",      date:"2026-06-26", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Tunisia",              away:"Netherlands",          venue:"Arrowhead Stadium, Kansas City" },
  { id:59,  stage:"Group D",      date:"2026-06-26", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Türkiye",              away:"USA",                  venue:"SoFi Stadium, Inglewood" },
  { id:60,  stage:"Group D",      date:"2026-06-26", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Paraguay",             away:"Australia",            venue:"Levi's Stadium, Santa Clara" },
  { id:61,  stage:"Group I",      date:"2026-06-26", timeCY:"22:00",      timeMX:"14:00",      home:"Norway",               away:"France",               venue:"Gillette Stadium, Foxborough" },
  { id:62,  stage:"Group I",      date:"2026-06-26", timeCY:"22:00",      timeMX:"14:00",      home:"Senegal",              away:"Iraq",                 venue:"BMO Field, Toronto" },
  { id:63,  stage:"Group H",      date:"2026-06-27", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Cape Verde",           away:"Saudi Arabia",         venue:"NRG Stadium, Houston" },
  { id:64,  stage:"Group H",      date:"2026-06-27", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Uruguay",              away:"Spain",                venue:"Estadio Akron, Zapopan" },
  { id:65,  stage:"Group G",      date:"2026-06-27", timeCY:"06:00 (+1)", timeMX:"22:00",      home:"Egypt",                away:"Iran",                 venue:"Lumen Field, Seattle" },
  { id:66,  stage:"Group G",      date:"2026-06-27", timeCY:"06:00 (+1)", timeMX:"22:00",      home:"New Zealand",          away:"Belgium",              venue:"BC Place, Vancouver" },
  { id:67,  stage:"Group L",      date:"2026-06-28", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Panama",               away:"England",              venue:"MetLife Stadium, East Rutherford" },
  { id:68,  stage:"Group L",      date:"2026-06-28", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Croatia",              away:"Ghana",                venue:"Lincoln Financial Field, Philadelphia" },
  { id:69,  stage:"Group K",      date:"2026-06-28", timeCY:"02:30 (+1)", timeMX:"18:30",      home:"Colombia",             away:"Portugal",             venue:"Hard Rock Stadium, Miami Gardens" },
  { id:70,  stage:"Group K",      date:"2026-06-28", timeCY:"02:30 (+1)", timeMX:"18:30",      home:"DR Congo",             away:"Uzbekistan",           venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:71,  stage:"Group J",      date:"2026-06-28", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Algeria",              away:"Austria",              venue:"Arrowhead Stadium, Kansas City" },
  { id:72,  stage:"Group J",      date:"2026-06-28", timeCY:"05:00 (+1)", timeMX:"21:00",      home:"Jordan",               away:"Argentina",            venue:"AT&T Stadium, Arlington" },
  { id:73,  stage:"Round of 32",  date:"2026-06-28", timeCY:"22:00",      timeMX:"14:00",      home:"Runner-up A",          away:"Runner-up B",          venue:"SoFi Stadium, Inglewood" },
  { id:76,  stage:"Round of 32",  date:"2026-06-29", timeCY:"20:00",      timeMX:"12:00",      home:"Winner C",             away:"Runner-up F",          venue:"NRG Stadium, Houston" },
  { id:74,  stage:"Round of 32",  date:"2026-06-29", timeCY:"23:30",      timeMX:"15:30",      home:"Winner E",             away:"Best 3rd (A/B/C/D/F)", venue:"Gillette Stadium, Foxborough" },
  { id:75,  stage:"Round of 32",  date:"2026-06-30", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Winner F",             away:"Runner-up C",          venue:"Estadio BBVA, Monterrey" },
  { id:78,  stage:"Round of 32",  date:"2026-06-30", timeCY:"20:00",      timeMX:"12:00",      home:"Runner-up E",          away:"Runner-up I",          venue:"AT&T Stadium, Arlington" },
  { id:77,  stage:"Round of 32",  date:"2026-07-01", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Winner I",             away:"Best 3rd (C/D/F/G/H)", venue:"MetLife Stadium, East Rutherford" },
  { id:79,  stage:"Round of 32",  date:"2026-07-01", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Winner A",             away:"Best 3rd (C/E/F/H/I)", venue:"Estadio Azteca, Mexico City" },
  { id:80,  stage:"Round of 32",  date:"2026-07-01", timeCY:"19:00",      timeMX:"11:00",      home:"Winner L",             away:"Best 3rd (E/H/I/J/K)", venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:82,  stage:"Round of 32",  date:"2026-07-01", timeCY:"23:00",      timeMX:"15:00",      home:"Winner G",             away:"Best 3rd (A/E/H/I/J)", venue:"Lumen Field, Seattle" },
  { id:81,  stage:"Round of 32",  date:"2026-07-02", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Winner D",             away:"Best 3rd (B/E/F/I/J)", venue:"Levi's Stadium, Santa Clara" },
  { id:84,  stage:"Round of 32",  date:"2026-07-02", timeCY:"22:00",      timeMX:"14:00",      home:"Winner H",             away:"Runner-up J",          venue:"SoFi Stadium, Inglewood" },
  { id:83,  stage:"Round of 32",  date:"2026-07-03", timeCY:"02:00 (+1)", timeMX:"18:00",      home:"Runner-up K",          away:"Runner-up L",          venue:"BMO Field, Toronto" },
  { id:85,  stage:"Round of 32",  date:"2026-07-03", timeCY:"06:00 (+1)", timeMX:"22:00",      home:"Winner B",             away:"Best 3rd (E/F/G/I/J)", venue:"BC Place, Vancouver" },
  { id:88,  stage:"Round of 32",  date:"2026-07-03", timeCY:"21:00",      timeMX:"13:00",      home:"Runner-up D",          away:"Runner-up G",          venue:"AT&T Stadium, Arlington" },
  { id:86,  stage:"Round of 32",  date:"2026-07-04", timeCY:"01:00 (+1)", timeMX:"17:00",      home:"Winner J",             away:"Runner-up H",          venue:"Hard Rock Stadium, Miami Gardens" },
  { id:87,  stage:"Round of 32",  date:"2026-07-04", timeCY:"04:30 (+1)", timeMX:"20:30",      home:"Winner K",             away:"Best 3rd (D/E/I/J/L)", venue:"Arrowhead Stadium, Kansas City" },
  { id:90,  stage:"Round of 16",  date:"2026-07-04", timeCY:"20:00",      timeMX:"12:00",      home:"Winner M73",           away:"Winner M75",           venue:"NRG Stadium, Houston" },
  { id:89,  stage:"Round of 16",  date:"2026-07-05", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Winner M74",           away:"Winner M77",           venue:"Lincoln Financial Field, Philadelphia" },
  { id:91,  stage:"Round of 16",  date:"2026-07-05", timeCY:"23:00",      timeMX:"15:00",      home:"Winner M76",           away:"Winner M78",           venue:"MetLife Stadium, East Rutherford" },
  { id:92,  stage:"Round of 16",  date:"2026-07-06", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Winner M79",           away:"Winner M80",           venue:"Estadio Azteca, Mexico City" },
  { id:93,  stage:"Round of 16",  date:"2026-07-06", timeCY:"22:00",      timeMX:"14:00",      home:"Winner M83",           away:"Winner M84",           venue:"AT&T Stadium, Arlington" },
  { id:94,  stage:"Round of 16",  date:"2026-07-07", timeCY:"03:00 (+1)", timeMX:"19:00",      home:"Winner M81",           away:"Winner M82",           venue:"Lumen Field, Seattle" },
  { id:95,  stage:"Round of 16",  date:"2026-07-07", timeCY:"19:00",      timeMX:"11:00",      home:"Winner M86",           away:"Winner M88",           venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:96,  stage:"Round of 16",  date:"2026-07-07", timeCY:"23:00",      timeMX:"15:00",      home:"Winner M85",           away:"Winner M87",           venue:"BC Place, Vancouver" },
  { id:97,  stage:"Quarterfinals",date:"2026-07-09", timeCY:"23:00",      timeMX:"15:00",      home:"Winner M89",           away:"Winner M90",           venue:"Gillette Stadium, Foxborough" },
  { id:98,  stage:"Quarterfinals",date:"2026-07-10", timeCY:"22:00",      timeMX:"14:00",      home:"Winner M93",           away:"Winner M94",           venue:"SoFi Stadium, Inglewood" },
  { id:99,  stage:"Quarterfinals",date:"2026-07-12", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Winner M91",           away:"Winner M92",           venue:"Hard Rock Stadium, Miami Gardens" },
  { id:100, stage:"Quarterfinals",date:"2026-07-12", timeCY:"04:00 (+1)", timeMX:"20:00",      home:"Winner M95",           away:"Winner M96",           venue:"Arrowhead Stadium, Kansas City" },
  { id:101, stage:"Semifinals",   date:"2026-07-14", timeCY:"22:00",      timeMX:"14:00",      home:"Winner M97",           away:"Winner M98",           venue:"AT&T Stadium, Arlington" },
  { id:102, stage:"Semifinals",   date:"2026-07-15", timeCY:"22:00",      timeMX:"14:00",      home:"Winner M99",           away:"Winner M100",          venue:"Mercedes-Benz Stadium, Atlanta" },
  { id:103, stage:"Third Place",  date:"2026-07-18", timeCY:"00:00 (+1)", timeMX:"16:00",      home:"Loser M101",           away:"Loser M102",           venue:"Hard Rock Stadium, Miami Gardens" },
  { id:104, stage:"Final",        date:"2026-07-19", timeCY:"22:00",      timeMX:"14:00",      home:"Winner M101",          away:"Winner M102",          venue:"MetLife Stadium, East Rutherford, NJ" },
];

const STAGE_ORDER = [
  "Group A","Group B","Group C","Group D","Group E","Group F",
  "Group G","Group H","Group I","Group J","Group K","Group L",
  "Round of 32","Round of 16","Quarterfinals","Semifinals","Third Place","Final",
];

// Light bluish palette
const C = {
  bg:         "#EEF3FA",
  surface:    "#FFFFFF",
  surfaceAlt: "#F4F8FF",
  border:     "#D4E2F4",
  borderDark: "#B8CCE8",
  blue:       "#2563EB",
  blueDark:   "#1D4ED8",
  blueLight:  "#DBEAFE",
  blueMid:    "#93C5FD",
  text:       "#0F172A",
  textMid:    "#334155",
  textMuted:  "#64748B",
  textFaint:  "#94A3B8",
  green:      "#16A34A",
  greenBg:    "#DCFCE7",
  greenBdr:   "#86EFAC",
  gold:       "#D97706",
  goldBg:     "#FEF3C7",
  goldBdr:    "#FCD34D",
  red:        "#DC2626",
};

const STAGE_ACCENT = {
  "Group A":C.blue,"Group B":C.blue,"Group C":C.blue,"Group D":C.blue,
  "Group E":C.blue,"Group F":C.blue,"Group G":C.blue,"Group H":C.blue,
  "Group I":C.blue,"Group J":C.blue,"Group K":C.blue,"Group L":C.blue,
  "Round of 32":"#7C3AED","Round of 16":"#6D28D9",
  "Quarterfinals":"#D97706","Semifinals":"#DC2626",
  "Third Place":C.textMuted,"Final":C.gold,
};

const STAGE_BG = {
  "Round of 32":"#EDE9FE","Round of 16":"#EDE9FE",
  "Quarterfinals":"#FEF3C7","Semifinals":"#FEE2E2",
  "Third Place":"#F1F5F9","Final":"#FEF3C7",
};

const FLAG_EMOJIS = {
  "Mexico":"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷","Czechia":"🇨🇿",
  "Canada":"🇨🇦","Bosnia & Herzegovina":"🇧🇦","USA":"🇺🇸","Paraguay":"🇵🇾",
  "Qatar":"🇶🇦","Switzerland":"🇨🇭","Brazil":"🇧🇷","Morocco":"🇲🇦",
  "Haiti":"🇭🇹","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Australia":"🇦🇺","Türkiye":"🇹🇷",
  "Germany":"🇩🇪","Curaçao":"🇨🇼","Netherlands":"🇳🇱","Japan":"🇯🇵",
  "Ivory Coast":"🇨🇮","Ecuador":"🇪🇨","Sweden":"🇸🇪","Tunisia":"🇹🇳",
  "Spain":"🇪🇸","Cape Verde":"🇨🇻","Belgium":"🇧🇪","Egypt":"🇪🇬",
  "Saudi Arabia":"🇸🇦","Uruguay":"🇺🇾","Iran":"🇮🇷","New Zealand":"🇳🇿",
  "France":"🇫🇷","Senegal":"🇸🇳","Iraq":"🇮🇶","Norway":"🇳🇴",
  "Argentina":"🇦🇷","Algeria":"🇩🇿","Austria":"🇦🇹","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","DR Congo":"🇨🇩","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croatia":"🇭🇷",
  "Ghana":"🇬🇭","Panama":"🇵🇦","Uzbekistan":"🇺🇿","Colombia":"🇨🇴",
};

const f = n => FLAG_EMOJIS[n] || "";
const isKnown = n => ALL_TEAMS.includes(n);
const isGroup = s => s.startsWith("Group");

function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"long"});
}

export default function FIFA2026() {
  const [winners, setWinners] = useState({});
  const [customTeams, setCustomTeams] = useState(()=>{ try{return JSON.parse(localStorage.getItem("fwc26_ct")||"{}")}catch{return{}} });
  const [stageFilter, setStage]   = useState("All");
  const [search, setSearch]       = useState("");
  const [pendingOnly, setPending] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [dropHome, setDropHome]   = useState("");
  const [dropAway, setDropAway]   = useState("");

  useEffect(() => {
  const unsub = onSnapshot(doc(db, "worldcup", "results"), (snapshot) => {
    if (snapshot.exists()) {
      setWinners(snapshot.data());
    }
  });

  return () => unsub();
}, []);

  useEffect(()=>{ try{localStorage.setItem("fwc26_ct",JSON.stringify(customTeams))}catch{} },[customTeams]);

  const played = Object.keys(winners).length;

  const filtered = useMemo(()=>ALL_MATCHES.filter(m=>{
    if (stageFilter!=="All" && m.stage!==stageFilter) return false;
    if (pendingOnly && winners[m.id]) return false;
    if (search) {
      const q=search.toLowerCase();
      const rh=customTeams[`${m.id}_home`]||m.home;
      const ra=customTeams[`${m.id}_away`]||m.away;
      return rh.toLowerCase().includes(q)||ra.toLowerCase().includes(q)||m.venue.toLowerCase().includes(q);
    }
    return true;
  }), [stageFilter,search,pendingOnly,winners,customTeams]);

  const byDate = useMemo(()=>{
    const g={};
    filtered.forEach(m=>{ (g[m.date]=g[m.date]||[]).push(m); });
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b));
  },[filtered]);

  const resolved = (m,side) => customTeams[`${m.id}_${side}`]||(side==="home"?m.home:m.away);

  function startEdit(match) {
    setEditing(match.id);
    setDropHome(customTeams[`${match.id}_home`]||(isKnown(match.home)?match.home:""));
    setDropAway(customTeams[`${match.id}_away`]||(isKnown(match.away)?match.away:""));
  }

  function saveTeams(matchId) {
    setCustomTeams(prev=>{
      const n={...prev};
      if(dropHome) n[`${matchId}_home`]=dropHome;
      if(dropAway) n[`${matchId}_away`]=dropAway;
      return n;
    });
    setEditing(null);
  }

  async function setWinner(matchId, val) {
  const updated = {
    ...winners,
    [matchId]: val
  };

  setWinners(updated);

  await setDoc(doc(db, "worldcup", "results"), updated);

  setEditing(null);
}

  function clearMatch(matchId) {
    setWinners(prev=>{ const n={...prev}; delete n[matchId]; return n; });
    setCustomTeams(prev=>{ const n={...prev}; delete n[`${matchId}_home`]; delete n[`${matchId}_away`]; return n; });
  }

  const inp = {
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.text, padding:"8px 12px", fontSize:13, outline:"none",
    fontFamily:"inherit",
  };

  const stagePillColors = {
    "All": C.blue,
    "Round of 32":"#7C3AED","Round of 16":"#6D28D9",
    "Quarterfinals":C.gold,"Semifinals":C.red,
    "Third Place":C.textMuted,"Final":C.gold,
  };
  function stageColor(s) { return stagePillColors[s]||C.blue; }

  return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif", color:C.text}}>

      {/* ── Header ── */}
      <div style={{background:C.blue, position:"sticky", top:0, zIndex:50, boxShadow:"0 2px 12px rgba(37,99,235,0.25)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:30}}>🏆</span>
            <div>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:1,color:"#fff",textTransform:"uppercase"}}>FIFA World Cup 2026™</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",letterSpacing:3,textTransform:"uppercase"}}>Match Tracker · Cyprus & Mexico City Times</div>
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:20}}>
            {[{l:"Matches",v:ALL_MATCHES.length,c:"#fff"},{l:"Played",v:played,c:"#BBF7D0"},{l:"Left",v:ALL_MATCHES.length-played,c:"#FEF08A"}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",letterSpacing:2,textTransform:"uppercase"}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{height:3,background:"rgba(255,255,255,0.15)"}}>
          <div style={{height:3,background:"rgba(255,255,255,0.85)",width:`${(played/ALL_MATCHES.length)*100}%`,transition:"width .4s"}}/>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 20px 0"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          <input type="text" placeholder="🔍  Search team or venue…" value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{...inp, flex:1, minWidth:180, boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}
          />
          <button onClick={()=>setPending(v=>!v)} style={{
            background: pendingOnly ? C.blue : C.surface,
            border:`1px solid ${pendingOnly ? C.blue : C.border}`,
            borderRadius:8, color: pendingOnly ? "#fff" : C.textMuted,
            padding:"8px 14px", fontSize:12, cursor:"pointer",
            fontWeight:pendingOnly?700:400, fontFamily:"inherit",
            boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
          }}>⏳ Pending only</button>
        </div>

        {/* Stage pills */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22}}>
          {["All",...STAGE_ORDER].map(s=>{
            const active = stageFilter===s;
            const col = stageColor(s);
            return (
              <button key={s} onClick={()=>setStage(s)} style={{
                background: active ? col : C.surface,
                border:`1px solid ${active ? col : C.border}`,
                borderRadius:20, color: active ? "#fff" : C.textMuted,
                padding:"5px 13px", fontSize:11, fontWeight:active?700:400,
                cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
                boxShadow: active ? `0 2px 8px ${col}44` : "none",
              }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* ── Match list ── */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 60px"}}>
        {byDate.length===0 && (
          <div style={{textAlign:"center",padding:60,color:C.textFaint,fontSize:16}}>No matches found</div>
        )}
        {byDate.map(([date,matches])=>(
          <div key={date} style={{marginBottom:28}}>
            {/* Date header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{
                fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",
                color:C.blue, whiteSpace:"nowrap",
              }}>{fmtDate(date)}</div>
              <div style={{flex:1,height:1,background:C.border}}/>
              <div style={{fontSize:11,color:C.textFaint}}>{matches.length} match{matches.length!==1?"es":""}</div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {matches.map(match=>{
                const won      = winners[match.id];
                const grp      = isGroup(match.stage);
                const accent   = STAGE_ACCENT[match.stage]||C.blue;
                const bgStage  = STAGE_BG[match.stage]||C.surface;
                const homeName = resolved(match,"home");
                const awayName = resolved(match,"away");
                const homeKn   = isKnown(homeName);
                const awayKn   = isKnown(awayName);
                const isEdit   = editing===match.id;
                const needTeams= !grp && (!isKnown(match.home)||!isKnown(match.away));

                return (
                  <div key={match.id} style={{
                    background: won ? C.greenBg : (grp ? C.surface : bgStage),
                    border:`1px solid ${won ? C.greenBdr : C.border}`,
                    borderLeft:`3px solid ${won ? C.green : accent}`,
                    borderRadius:10,
                    padding:"10px 14px",
                    display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                    transition:"all .2s",
                  }}>

                    {/* # */}
                    <div style={{fontSize:10,color:C.textFaint,minWidth:22,textAlign:"center",fontWeight:600}}>#{match.id}</div>

                    {/* Times — two zones */}
                    <div style={{
                      display:"flex",flexDirection:"column",gap:3,
                      background:C.blueLight,border:`1px solid ${C.blueMid}`,
                      borderRadius:8,padding:"5px 10px",minWidth:130,
                    }}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13}}>🇨🇾</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.blueDark,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>{match.timeCY}</span>
                        <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>EEST</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13}}>🇲🇽</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.textMid,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>{match.timeMX}</span>
                        <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>CDT</span>
                      </div>
                    </div>

                    {/* Stage badge */}
                    <div style={{
                      fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
                      color:accent,background:`${accent}18`,border:`1px solid ${accent}44`,
                      borderRadius:4,padding:"2px 7px",whiteSpace:"nowrap",
                    }}>{match.stage}</div>

                    {/* Teams */}
                    <div style={{flex:1,display:"flex",alignItems:"center",gap:10,minWidth:230}}>
                      <span style={{
                        flex:1,textAlign:"right",fontSize:13,
                        fontWeight:won===homeName?700:500,
                        color:won===homeName?C.green:C.text,
                        display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,
                      }}>
                        {won===homeName&&<span style={{color:C.green}}>🏆</span>}
                        {homeKn&&f(homeName)} {homeName}
                      </span>
                      <span style={{
                        fontSize:10,fontWeight:700,color:C.textFaint,
                        background:C.surfaceAlt,border:`1px solid ${C.border}`,
                        padding:"2px 7px",borderRadius:4,letterSpacing:1,
                      }}>VS</span>
                      <span style={{
                        flex:1,fontSize:13,
                        fontWeight:won===awayName?700:500,
                        color:won===awayName?C.green:C.text,
                        display:"flex",alignItems:"center",gap:5,
                      }}>
                        {awayKn&&f(awayName)} {awayName}
                        {won===awayName&&<span style={{color:C.green}}>🏆</span>}
                      </span>
                    </div>

                    {/* Venue */}
                    <div style={{fontSize:10,color:C.textFaint,minWidth:130,maxWidth:190,textAlign:"right",lineHeight:1.4}}>
                      📍 {match.venue}
                    </div>

                    {/* Action */}
                    <div style={{display:"flex",alignItems:"center",gap:8,minWidth:170}}>
                      {isEdit ? (
                        <div style={{display:"flex",flexDirection:"column",gap:6,padding:"4px 0"}}>
                          {needTeams && (
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                              <select value={dropHome} onChange={e=>setDropHome(e.target.value)} style={{...inp,padding:"5px 8px",fontSize:12,minWidth:150,cursor:"pointer"}}>
                                <option value="">— Home team —</option>
                                {ALL_TEAMS.map(t=><option key={t} value={t}>{f(t)} {t}</option>)}
                              </select>
                              <select value={dropAway} onChange={e=>setDropAway(e.target.value)} style={{...inp,padding:"5px 8px",fontSize:12,minWidth:150,cursor:"pointer"}}>
                                <option value="">— Away team —</option>
                                {ALL_TEAMS.map(t=><option key={t} value={t}>{f(t)} {t}</option>)}
                              </select>
                              <button onClick={()=>saveTeams(match.id)} style={{
                                background:C.blue,border:"none",borderRadius:6,color:"#fff",
                                padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                              }}>Set</button>
                              <button onClick={()=>setEditing(null)} style={{
                                background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                color:C.textMuted,padding:"6px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit",
                              }}>Cancel</button>
                            </div>
                          )}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:1}}>Winner:</span>
                            {[homeName,awayName].filter(Boolean).map(opt=>(
                              <button key={opt} onClick={()=>setWinner(match.id,opt)} style={{
                                background:C.greenBg,border:`1px solid ${C.greenBdr}`,
                                borderRadius:6,color:C.green,padding:"5px 10px",
                                fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                              }}>
                                {isKnown(opt)&&f(opt)} {opt}
                              </button>
                            ))}
                            {grp&&(
                              <button onClick={()=>setWinner(match.id,"Draw")} style={{
                                background:C.surfaceAlt,border:`1px solid ${C.border}`,
                                borderRadius:6,color:C.textMid,padding:"5px 10px",
                                fontSize:12,cursor:"pointer",fontFamily:"inherit",
                              }}>🤝 Draw</button>
                            )}
                            {!needTeams&&<button onClick={()=>setEditing(null)} style={{
                              background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                              color:C.textFaint,padding:"5px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit",
                            }}>✕</button>}
                          </div>
                        </div>
                      ) : won ? (
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{
                            background:C.greenBg,border:`1px solid ${C.greenBdr}`,
                            borderRadius:20,padding:"4px 12px",fontSize:12,
                            color:C.green,fontWeight:600,whiteSpace:"nowrap",
                          }}>🏆 {won}</div>
                          <button onClick={()=>clearMatch(match.id)} title="Clear" style={{
                            background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                            color:C.textFaint,padding:"3px 7px",fontSize:10,cursor:"pointer",fontFamily:"inherit",
                          }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={()=>startEdit(match)} style={{
                          background:"transparent",
                          border:`1px dashed ${C.blueMid}`,
                          borderRadius:8,color:C.blue,
                          padding:"6px 14px",fontSize:12,cursor:"pointer",
                          whiteSpace:"nowrap",fontFamily:"inherit",
                          fontWeight:500,
                        }}
                          onMouseEnter={e=>{e.currentTarget.style.background=C.blueLight;}}
                          onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
                        >+ Add Result</button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"14px 20px",textAlign:"center",color:C.textFaint,fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>
        🇨🇾 Cyprus EEST (UTC+3) · 🇲🇽 Mexico City CDT (UTC−5) · 104 matches · 11 Jun – 19 Jul 2026
      </div>
    </div>
  );
}
