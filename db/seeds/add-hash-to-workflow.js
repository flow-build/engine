const JSum = require('jsum');

exports.seed = async function(knex) {
    try {
        let existing_blueprints = await knex.select()
            .from('workflow').where('blueprint_hash', null);

        for (const bp of existing_blueprints) {
            await knex('workflow').update({ blueprint_hash: JSum.digest(bp, 'SHA256', 'hex')})
                .where('id', bp.id);
        }
    } catch (e) {
        console.log(e);
    }
};
