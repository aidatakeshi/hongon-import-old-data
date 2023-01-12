import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

//Find name -> id mapping for operators data
const operator_id_mapping = await $.getOperatorIDMapping(client_old, client_new);

if (!Object.keys(operator_id_mapping).length){
    console.log(chalk.red('Please import-operators first.'));
    console.log('');
    process.exit(1);
}

/**
 * [Old] line_types
 * [New] hongon_hongon_line_types
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM line_types', []);
const line_types = res1.rows;

//Map Old IDs to New UUIDs
let line_types_id_uuid = {};
for (let item of line_types){
    line_types_id_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_line_types', []);

//Insert to New Database
console.log(boxen('Line Types'));

for (let i = 0; i < line_types.length; i++){
    const item = line_types[i];
    await $.insertData(client_new, 'line_types', {
        id: line_types_id_uuid[item.id],
        name_chi: item.name_chi,
        name_eng: item.name_eng,
        map_color: item.color,
        map_thickness: item.major ? 3 : 2,
        sort: item.sort,
        remarks: item.remarks,
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * [Old] line_groups, lines, line_stations
 * [New] hongon_hongon_lines, hongon_hongon_line_sections
 */

//Get line_groups & lines
const query2 = `select line_groups.name_chi as "g_name_chi", line_groups.name_eng as "g_name_eng", 
line_groups.name_eng_short as "g_name_eng_short", lines.* from lines
left join line_groups on lines.line_group_id = line_groups.id
order by line_group_id`;
const res2 = await client_old.query(query2, []);

let lines = {};
for (let item of res2.rows){
    const group = item.line_group_id || item.id;
    if (!lines[group]) lines[group] = [];
    lines[group].push(item);
}

//Get line_stations
const query3 = `select * from lines_stations order by line_id, sort`;
const res3 = await client_old.query(query3, []);
let line_stations = {};
for (let item of res3.rows){
    const line_id = item.line_id;
    if (!line_stations[line_id]) line_stations[line_id] = [];
    line_stations[line_id].push(item);
}

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_lines', []);

//Insert to New Database
console.log(boxen('Lines (originally LineGroups, Lines & LineStations)'));

for (let id in lines){
    const line_subs = lines[id];
    const line = line_subs[0];

    //Prepare line data
    const line_name_chi = line.line_group_id ? line.g_name_chi : line.name_chi;
    const line_name_eng = line.line_group_id ? line.g_name_eng : line.name_eng;
    const line_name_eng_short = line.g_name_eng_short || line.name_eng_short;
    const line_id = uuid();

    let line_data = {
        id: line_id,
        line_type_id: line_types_id_uuid[line.line_type_id],
        operator_id: operator_id_mapping[line.operator_id],
        color: line.color,
        color_text: line.color_text,
        name_chi: line_name_chi,
        name_eng: line_name_eng,
        name_short_eng: line_name_eng_short,
        remarks: line.remarks,
        max_speed_kph: line.max_speed_kph,
        sections: [],
        _data: {
            length_km: 0,
            x_min: null, x_max: null,
            y_min: null, y_max: null,
            station_ids: '',
        },
    };
    console.log(chalk.yellow(`[Line] `) + `${line_name_chi} / ${line_name_eng}`);

    //For each line_sub
    let sub_items = [];
    let x = [];
    let y = [];
    let lengths = [];

    for (let line_sub of line_subs){

        //Prepare Sections -> Stations
        const stations = (line_stations[line_sub.id] || []).map(section => {
            if (!Array.isArray(section.segments)) section.segments = [];
            return {
                id: section.id,
                station_id: section.station_id,
                no_tracks: section.no_tracks,
                segments: section.segments.map(segment => ({
                    x2: $.getLongitudeDelta(segment.x2),
                    y2: $.getLatitudeDelta(segment.y2),
                    x: $.getLongitude(segment.x),
                    y: $.getLatitude(segment.y),
                    x1: $.getLongitudeDelta(segment.x1),
                    y1: $.getLatitudeDelta(segment.y1),
                })),
                scheduling: {},
                distance_km: section.distance_km,
                mileage_km: section.mileage_km,
                x_min: !section.segments.length ? null
                        : $.getLongitude(Math.min(...section.segments.map(segment => segment.x))),
                x_max: !section.segments.length ? null
                        : $.getLongitude(Math.max(...section.segments.map(segment => segment.x))),
                y_max: !section.segments.length ? null
                        : $.getLatitude(Math.min(...section.segments.map(segment => segment.y))),
                y_min: !section.segments.length ? null
                        : $.getLatitude(Math.max(...section.segments.map(segment => segment.y))),
            };
        });

        //Prepare LineSub -> Section
        const subline_name_chi = line.line_group_id ? $.getTextInsideBracket(line_sub.name_chi) : null;
        const subline_name_eng = line.line_group_id ? $.getTextInsideBracket(line_sub.name_eng) : null;
        x.push($.getLongitude(line_sub.x_min), $.getLongitude(line_sub.x_max));
        y.push($.getLatitude(line_sub.y_min), $.getLatitude(line_sub.y_max));
        lengths.push(line_sub.length_km);

        let section = {
            name_chi: subline_name_chi,
            name_eng: subline_name_eng,
            stations: stations,
            length_km: line_sub.length_km,
            x_min: $.getLongitude(line_sub.x_min),
            x_max: $.getLongitude(line_sub.x_max),
            y_min: $.getLatitude(line_sub.y_max),
            y_max: $.getLatitude(line_sub.y_min),
        };
        line_data.sections.push(section);

        if (subline_name_chi || subline_name_eng){
            console.log(chalk.blue(`[Sub] ${subline_name_chi} / ${subline_name_eng}`));
        }else{
            console.log(chalk.blue(`[Sub] #`));
        }

    }

    //Aggregate Line Section Data to Line
    line_data._data.length_km = lengths.filter(Number.isFinite)
    .reduce((prev, curr) => (prev + curr), 0);
    line_data._data.length_km = parseFloat(line_data._data.length_km.toFixed(1));
    line_data._data.x_min = Math.min(...x.filter(Number.isFinite)),
    line_data._data.x_max = Math.max(...x.filter(Number.isFinite)),
    line_data._data.y_min = Math.min(...y.filter(Number.isFinite)),
    line_data._data.y_max = Math.max(...y.filter(Number.isFinite)),
    line_data._data.station_ids = line_data.sections.map(section => (
        section.stations.map(station => '|' + station.station_id).join('')
    )).join('');
    
    //Insert to lines
    await $.insertData(client_new, 'lines', line_data);

}

/**
 * End
 */
 process.exit(1);