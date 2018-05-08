
import lodash from 'lodash'; 
import { leerCuentaContableAsociada } from '/server/imports/general/leerCuentaContableAsociada'; 

import { Monedas } from '/imports/collections/catalogos/monedas'; 
import { Companias } from '/imports/collections/catalogos/companias'; 

function transaccion_PagoSiniestros(remesa, cuota, siniestro, numeroTransaccion) {

    // grabamos la partida # 10 de la transaccion, con la cuota cobrada ...
    let compania = Companias.findOne(cuota.compania);
    let pago = lodash.find(cuota.pagos, pago => { return pago.remesaID === remesa._id; });
    let moneda = Monedas.findOne(pago.moneda);

    numeroTransaccion += 10;

    let transaccion = {
        _id: new Mongo.ObjectID()._str,
        transaccion: {
            numero: numeroTransaccion,
            descripcion: `Pago de siniestros - Siniestro y número de liq: (${cuota.source.origen}) ${cuota.source.numero} - cuota: ${cuota.numero.toString()} de ${cuota.cantidad.toString()}`,
        },
        partidas: []
    };

    
    // leemos la cuenta contable asociada, para asignar a la partida 
    let cuentaContable = leerCuentaContableAsociada(70, pago.moneda, cuota.compania, cuota.source.origen); 

    let partida = {};
    let numeroPartida = 10;

    partida._id = new Mongo.ObjectID()._str;
    partida.numero = numeroPartida;
    partida.tipo = 800;      // 800: siniestro pagado al cedente (débito a la cuenta siniestros por pagar)
    partida.codigo = cuentaContable && cuentaContable.cuentaContable ? cuentaContable.cuentaContable : null;
    partida.compania = cuota.compania;
    partida.descripcion = `Siniestro pagado - ${compania.abreviatura} - ${moneda.simbolo}`;
    partida.referencia = `${cuota.source.origen}-${cuota.source.numero}; cuota: ${cuota.numero.toString()}/${cuota.cantidad.toString()}`;
    partida.moneda = pago.moneda;
    partida.monto = lodash.round(pago.monto, 2);  // el monto debe venir positivo y lo dejamos así, pues hacemos un débito a la cuenta 'siniestros por pagar'

    transaccion.partidas.push(partida);

    // finalmente, agregamos la transacción (con todas sus partidas) al cuadre de la remesa
    remesa.cuadre.push(transaccion);

    return numeroTransaccion;
};

RemesasCuadre_Methods.transaccion_PagoSiniestros = transaccion_PagoSiniestros;
