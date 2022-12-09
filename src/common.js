import chalk from 'chalk';
import 'dotenv/config';
import pg from 'pg';
const Client = pg.Client;

async function getConnection(){
    try{
        const client_old = new Client({
            host: process.env.OLD_DB_HOST,
            database: process.env.OLD_DB_DATABASE,
            user: process.env.OLD_DB_USER,
            password: process.env.OLD_DB_PASSWORD,
            port: process.env.OLD_DB_PORT,
        });
        const client_new = new Client({
            host: process.env.NEW_DB_HOST,
            database: process.env.NEW_DB_DATABASE,
            user: process.env.NEW_DB_USER,
            password: process.env.NEW_DB_PASSWORD,
            port: process.env.NEW_DB_PORT,
        });
        await client_old.connect();
        await client_new.connect();
        return {client_old, client_new};

    }catch(error){
        console.log(chalk.red(error));
        process.exit(1);
    }
};

async function insertData(db_client, table, data = {}){
    let fields = [];
    let placeholders = [];
    let values = [];
    let i = 0;
    for (let field in data){
        fields.push(field);
        placeholders.push(`$${++i}`);
        if (typeof data[field] === 'object' && data[field] !== null){
            data[field] = JSON.stringify(data[field]);
        }
        values.push(data[field]);
    }
    fields.push("created_at", "updated_at");
    placeholders.push("NOW()", "NOW()");
    const query = `INSERT INTO hongon_hongon_${table}(${fields.join(', ')}) VALUES(${placeholders.join(', ')})`;
    await db_client.query(query, values);
}

async function getOperatorIDMapping(client_old, client_new){
    const res_old = await client_old.query(`SELECT name_chi, id FROM operators`, []);
    const res_new = await client_new.query(`SELECT name_chi, id FROM hongon_hongon_operators`, []);
    let mapping_name_chi_new_id = {};
    for (let item of res_new.rows){
        mapping_name_chi_new_id[item.name_chi] = item.id;
    }
    let mapping_old_id_new_id = {};
    for (let item of res_old.rows){
        mapping_old_id_new_id[item.id] = mapping_name_chi_new_id[item.name_chi] || undefined;
    }
    return mapping_old_id_new_id;
}

async function getRegionIDMapping(client_old, client_new){
    const res_old = await client_old.query(`SELECT name_chi, id FROM prefectures`, []);
    const res_new = await client_new.query(`SELECT name_chi, id FROM hongon_hongon_regions`, []);
    let mapping_name_chi_new_id = {};
    for (let item of res_new.rows){
        mapping_name_chi_new_id[item.name_chi] = item.id;
    }
    let mapping_old_id_new_id = {};
    for (let item of res_old.rows){
        mapping_old_id_new_id[item.id] = mapping_name_chi_new_id[item.name_chi] || undefined;
    }
    return mapping_old_id_new_id;
}

function getTextInsideBracket(string){
    const right_of_open_bracket = string.split('(')[1];
    if (right_of_open_bracket === undefined) return null;
    return right_of_open_bracket.split(')')[0];
}

function getLongitude(x){
    if (x === null || x === undefined) return null;
    const cos36_5 = 0.803856861;
    const val = 158 + (x - 3500) / (5000 / 9) / cos36_5;
    return (val - 0).toFixed(5) - 0;
}

function getLongitudeDelta(x){
    if (x === null || x === undefined) return null;
    const cos36_5 = 0.803856861;
    const val = x / (5000 / 9) / cos36_5;
    return (val - 0).toFixed(5) - 0;
}

function getLatitude(y){
    if (y === null || y === undefined) return null;
    const val = 36.5 + (2500 - y) / (5000 / 9);
    return (val - 0).toFixed(5) - 0;
}

function getLatitudeDelta(y){
    if (y === null || y === undefined) return null;
    const val = -y / (5000 / 9);
    return (val - 0).toFixed(5) - 0;
}

export {
    getConnection,
    insertData,
    getOperatorIDMapping, getRegionIDMapping,
    getTextInsideBracket,
    getLongitude, getLatitude, getLongitudeDelta, getLatitudeDelta,
};