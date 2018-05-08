


export function MensajeErrorDesdeMethod_preparar(errorFromMeteorMethod) {
    // preparamos el mensaje de error que debe ser mostrado al usuario, cuando un Meteor Method falla
    // con un objeto 'error' ...
    let err = errorFromMeteorMethod;

    let errorMessage = "<b>Error:</b> se ha producido un error al intentar ejecutar la operación.<br />";

    let algo = false;

    if (err.error) {
        errorMessage += `${err.error}`;
        algo = true;
    }

    if (err.errorType) {
        if (algo) errorMessage += ` - `;
        errorMessage += `${err.errorType}`;
        algo = true;
    }

    if (err.reason) {
        if (algo) errorMessage += ` - `;
        errorMessage += `${err.reason}`;
        algo = true;
    }

    if (err.details) {
        if (algo) errorMessage += ` - `;
        errorMessage += `${err.details}`;
        algo = true;
    }

    if (err.message) {
        if (algo) errorMessage += ` - `;
        errorMessage += `${err.message}`;
        algo = true;
    }

    return errorMessage;
}
