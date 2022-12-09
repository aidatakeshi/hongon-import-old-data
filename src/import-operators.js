import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

/**
 * operator_types
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM operator_types', []);
const operator_types = res1.rows;

//Map Old IDs to New UUIDs
let id_to_uuid = {};
for (let item of operator_types){
    id_to_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_operator_types', []);

//Insert to New Database
console.log(boxen('Operator Types'));

for (let i = 0; i < operator_types.length; i++){
    const item = operator_types[i];
    await $.insertData(client_new, 'operator_types', {
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
 * operators
 */

const res2 = await client_old.query('SELECT * FROM operators', []);
const operators = res2.rows;

//Remove Old Items
await client_new.query('TRUNCATE hongon_hongon_operators', []);

//Insert to New Database
console.log(boxen('Operators'));

for (let i = 0; i < operators.length; i++){
    const item = operators[i];
    await $.insertData(client_new, 'operators', {
        id: uuid(),
        operator_type_id: id_to_uuid[item.operator_type_id],
        name_chi: item.name_chi,
        name_eng: item.name_eng,
        name_short_chi: item.name_chi_short,
        name_short_eng: item.name_eng_short,
        remarks: item.remarks,
        color: item.color,
        color_text: item.color_text,
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * End
 */
process.exit(1);