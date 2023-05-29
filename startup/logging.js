const { format, createLogger, transports } = require('winston');
const { combine, timestamp, prettyPrint, printf, json } = format;

module.exports = function (debug) {
    const logger = createLogger({
        format: combine(
            json(),
            timestamp(),
            prettyPrint(),
            printf((info) => {
                const { message, timestamp, level } = info;

                let ctimestamp = new Date(timestamp);
                const date = ctimestamp.toLocaleDateString();
                const time = ctimestamp.toLocaleTimeString();

                return `\nDate: ${date}, Time: ${time}\n\n[${level}]: ${message}\n\n=====================================================`;
            })
        ),
        transports: [
            new transports.Console({ level: 'warn' }),

            new transports.File({
                filename: 'logs/general.log',
                level: 'warn',
            }),

            new transports.File({
                filename: 'logs/exceptions_rejections.log',
                level: 'error',
                handleRejections: true,
                handleExceptions: true
            })
        ],
    });

    logger.on('error', function (err) {
        debug("logged through winston: ", err.message);
    });
}