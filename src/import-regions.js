import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

/**
 * prefecture_areas
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM prefecture_areas', []);
const prefecture_areas = res1.rows;

//Map Old IDs to New UUIDs
let id_to_uuid = {};
for (let item of prefecture_areas){
    id_to_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_region_groups', []);

//Insert to New Database
console.log(boxen('Regions Broader (originally Prefecture Areas)'));

for (let i = 0; i < prefecture_areas.length; i++){
    const item = prefecture_areas[i];
    await $.insertData(client_new, 'region_groups', {
        id: id_to_uuid[item.id],
        name_chi: item.name_chi,
        name_eng: item.name_eng,
        sort: item.sort,
        remarks: item.remarks,
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * prefectures
 */

const res2 = await client_old.query('SELECT * FROM prefectures', []);
const prefectures = res2.rows;

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_regions', []);

//Insert to New Database
console.log(boxen('Regions (originally Prefectures)'));

for (let i = 0; i < prefectures.length; i++){
    const item = prefectures[i];
    await $.insertData(client_new, 'regions', {
        id: uuid(),
        region_broader_id: id_to_uuid[item.area_id],
        name_chi: item.name_chi,
        name_eng: item.name_eng,
        name_suffix_chi: item.name_chi_suffix,
        name_suffix_eng: item.name_eng_suffix,
        name_short_chi: item.name_chi_short,
        name_short_eng: item.name_eng_short,
        sort: item.sort,
        remarks: item.remarks,
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * End
 */
process.exit(1);