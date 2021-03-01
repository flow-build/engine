module.exports = function startLogger(em) {
    em.onAny((e, d) => {
        console.log(e);
        if (d) console.log(`Body: ${JSON.stringify(d)}`);
    });
};