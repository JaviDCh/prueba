
import { Meteor } from 'meteor/meteor'; 
import { Mongo } from 'meteor/mongo'; 
import { check } from 'meteor/check';
import { Match } from 'meteor/check'

import moment from 'moment';
import lodash from 'lodash';
import numeral from 'numeral';

import { Riesgos } from '/imports/collections/principales/riesgos';  
import { Siniestros } from '/imports/collections/principales/siniestros'; 
import { Contratos } from '/imports/collections/principales/contratos'; 
import { Monedas } from '/imports/collections/catalogos/monedas'; 
import { Companias } from '/imports/collections/catalogos/companias'; 
import { Asegurados } from '/imports/collections/catalogos/asegurados'; 
import { Cuotas } from '/imports/collections/principales/cuotas'; 
import { Suscriptores } from '/imports/collections/catalogos/suscriptores'; 
import { Ramos } from '/imports/collections/catalogos/ramos'; 

import { Consulta_MontosPendientesCobro_Vencimientos } from '/imports/collections/consultas/consultas_MontosPendientesCobro_Vencimientos'; 

Meteor.methods(
{
    consultas_MontosPendientesCobro_Vencimientos: function (filtro) {

        check(filtro, Match.ObjectIncluding({ fechaPendientesAl: Date, fechaLeerHasta: Date, cia: String }));

        if (!filtro) {
            throw new Meteor.Error("Ud. debe indicar un criterio de selección a esta consulta.");
        }

        // antes que nada, eliminamos del collection de la consulta, los registros de la consulta anterior
        Consulta_MontosPendientesCobro_Vencimientos.remove({ user: this.userId });

        var matchCriteria = {
            fecha: { $lte: filtro.fechaLeerHasta },
            'pagos.completo' : { $nin: [ true ] },
            cia: filtro.cia,
            monto: { $gt: 0 },
        };

        if (filtro.fechaEmisionDesde) {
            matchCriteria.fechaEmision = {
                $gte: moment(filtro.fechaEmisionDesde).toDate(),
                $lte: moment(filtro.fechaEmisionHasta).toDate(),
            };
        }

        if (filtro.fechaCuotaDesde) {
            matchCriteria.fecha = {
                $gte: moment(filtro.fechaCuotaDesde).toDate(),
                $lte: moment(filtro.fechaCuotaHasta).toDate(),
            };
        }

        if (filtro.fechaVencimientoDesde) {
            matchCriteria.fechaVencimiento = {
                $gte: moment(filtro.fechaVencimientoDesde).toDate(),
                $lte: moment(filtro.fechaVencimientoHasta).toDate(),
            };
        }

        if (filtro.compania && Array.isArray(filtro.compania) && filtro.compania.length > 0) {
            var array = lodash.clone(filtro.compania);
            matchCriteria.compania = { $in: array };
        }

        if (filtro.moneda && Array.isArray(filtro.moneda) && filtro.moneda.length > 0) {
            const array = lodash.clone(filtro.moneda);
            matchCriteria.moneda = { $in: array };
        }

        // leemos las cuotas anteriores a la fecha 'fechaLeerHasta', que no tengan un pago completo, para la compañína seleccionada
        // y cuyo monto sea mayor que cero (solo montos por cobrar)
        let result = Cuotas.find(matchCriteria).fetch();

        // -------------------------------------------------------------------------------------------------------------
        // valores para reportar el progreso
        let numberOfItems = result.length;
        let reportarCada = Math.floor(numberOfItems / 25);
        let reportar = 0;
        let cantidadRecs = 0;
        const numberOfProcess = 2;
        let currentProcess = 1;
        let message = `leyendo las cuotas pendientes de cobro ... `;

        // nótese que eventName y eventSelector no cambiarán a lo largo de la ejecución de este procedimiento
        const eventName = "montosPendientesCobro_vencimientos_consulta_reportProgress";
        const eventSelector = { myuserId: Meteor.userId(), app: 'scrwebm', process: 'montosPendientesCobro_vencimientos_consulta' };
        let eventData = {
                          current: currentProcess, max: numberOfProcess, progress: '0 %',
                          message: message
                        };

        // sync call
        Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
        // -------------------------------------------------------------------------------------------------------------

        // leemos y recorremos los items seleccionados arriba para registrar el nombre de suscriptor y asegurado
        // nótese como, para contratos, leemos código y referencia en vez de asegurado
        result.forEach(cuota => {

            cuota.suscriptor = null;
            cuota.asegurado = null;

            switch (cuota.source.origen) {

                case 'fac': {
                    const riesgo = Riesgos.findOne(cuota.source.entityID, { suscritor: 1, asegurado: 1 });

                    if (riesgo) {
                        cuota.suscriptor = riesgo.suscriptor ? riesgo.suscriptor : null;
                        cuota.asegurado = riesgo.asegurado ? riesgo.asegurado : null;
                        cuota.ramo = riesgo.ramo ? riesgo.ramo : null;
                    }

                    break;
                }
                case 'sinFac': {
                    const siniestro = Siniestros.findOne(cuota.source.entityID, { suscritor: 1, asegurado: 1 });

                    if (siniestro) {
                        cuota.suscriptor = siniestro.suscriptor ? siniestro.suscriptor : null;
                        cuota.asegurado = siniestro.asegurado ? siniestro.asegurado : null;
                        cuota.ramo = siniestro.ramo ? siniestro.ramo : null;
                    }

                    break;
                }
                case 'capa':
                case 'cuenta': {
                    const contrato = Contratos.findOne(cuota.source.entityID, { suscritor: 1, codigo: 1, referencia: 1 });

                    if (contrato) {
                        cuota.suscriptor = contrato.suscriptor ? contrato.suscriptor : null;
                        cuota.asegurado = contrato.referencia ? contrato.referencia : null;
                        cuota.ramo = contrato.ramo ? contrato.ramo : null;
                    }

                    break;
                }
            }

            // -------------------------------------------------------------------------------------------------------
            // vamos a reportar progreso al cliente; solo 25 veces ...
            cantidadRecs++;
            if (numberOfItems <= 25) {
                // hay menos de 20 registros; reportamos siempre ...
                eventData = {
                              current: currentProcess, max: numberOfProcess,
                              progress: numeral(cantidadRecs / numberOfItems).format("0 %"),
                              message: message
                            };
                Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
            }
            else {
                reportar++;
                if (reportar === reportarCada) {
                    eventData = {
                                  current: currentProcess, max: numberOfProcess,
                                  progress: numeral(cantidadRecs / numberOfItems).format("0 %"),
                                  message: message
                                };
                    Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
                    reportar = 0;
                }
            }
            // -------------------------------------------------------------------------------------------------------
        })

        // si el usuario indica filtros para: suscriptor, los aplicamos ahora (con lodash)
        if (filtro.suscriptor && Array.isArray(filtro.suscriptor) && filtro.suscriptor.length > 0) {
            result = lodash.filter(result, r => {
                return r.suscriptor && lodash.some(filtro.suscriptor, a => { return a === r.suscriptor; });
            })
        }

        // -------------------------------------------------------------------------------------------------------------
        // valores para reportar el progreso
         numberOfItems = result.length;
         reportarCada = Math.floor(numberOfItems / 25);
         reportar = 0;
         cantidadRecs = 0;
         currentProcess = 2;
         message = `leyendo las cuotas pendientes de cobro ... `;

        // sync call
        Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
        // -------------------------------------------------------------------------------------------------------------

        let cantidadRegistrosAgregados = 0;

        let moneda = {};
        let compania = {};
        let suscriptor = {};
        let asegurado = null;
        let ramo = {}; 

        // el usuario puede indicar nombres de compañía, moneda y suscriptor como parte de su filtro
        // la idea es que puede indicar *solo* parte del nombre para filtrar por allí 
        const { compania_text, moneda_text, suscriptor_text } = filtro; 

        for (const cuota of result) {

            moneda = Monedas.findOne(cuota.moneda, { fields: { simbolo: 1, descripcion: 1, }});
            compania = Companias.findOne(cuota.compania, { fields: { abreviatura : 1, nombre: 1, }});
            suscriptor = Suscriptores.findOne(cuota.suscriptor, { fields: { abreviatura: 1, nombre: 1 } });
            ramo = Ramos.findOne(cuota.ramo, { fields: { abreviatura: 1, descripcion: 1 } });

            // si el usuario indicó filtros por catálogos, en texto, los aplicamos ahora 

            // buscamos por compañía 
            if (compania && compania_text && !(compania.nombre.toLowerCase().includes(compania_text.toLowerCase()) ||
                                               compania.abreviatura.toLowerCase().includes(compania_text.toLowerCase()))) {
                continue;
            }

            // buscamos por moneda 
            if (moneda && moneda_text && !(moneda.descripcion.toLowerCase().includes(moneda_text.toLowerCase()) ||
                                           moneda.simbolo.toLowerCase().includes(moneda_text.toLowerCase()))) {
                continue;
            }

            // buscamos por suscriptor 
            if (suscriptor && suscriptor_text && !(suscriptor.nombre.toLowerCase().includes(suscriptor_text.toLowerCase()) ||
                                                   suscriptor.abreviatura.toLowerCase().includes(suscriptor_text.toLowerCase()))) {
                continue;
            }
            
            if (cuota.source.origen === 'capa' || cuota.source.origen === 'cuenta') {
                // arriba asignamos la referencia del contrato como asegurado ... 
                asegurado = cuota.asegurado; 
            } else { 
                const abreviaturaAsegurado = Asegurados.findOne(cuota.asegurado, { fields: { abreviatura : 1 }});
                asegurado = abreviaturaAsegurado ? abreviaturaAsegurado.abreviatura : "Indef"; 
            }

            const cuotaPendiente = {
                _id: new Mongo.ObjectID()._str,
                
                moneda: cuota.moneda,
                monedaDescripcion: moneda ? moneda.descripcion : "Indef",
                monedaSimbolo: moneda ? moneda.simbolo : "Indef",

                compania: cuota.compania,
                companiaNombre: compania ? compania.nombre : "Indef",
                companiaAbreviatura: compania ? compania.abreviatura : "Indef",

                ramo: cuota.ramo,
                ramoDescripcion: ramo ? ramo.descripcion : "Indef",
                ramoAbreviatura: ramo ? ramo.abreviatura : "Indef",

                suscriptor: cuota.suscriptor,
                suscriptorAbreviatura: suscriptor ? suscriptor.abreviatura : "Indef",
                aseguradoAbreviatura: asegurado ? asegurado : "Indef", 

                cuotaID: cuota._id,
                entidadOriginalID: cuota.source.entityID,
                entidadOriginalTipo: cuota.source.origen, 
                origen: cuota.source.origen + '-' + cuota.source.numero,
                numero: cuota.numero,
                cantidad: cuota.cantidad,
 
                fechaEmision: cuota.fechaEmision, 
                fecha: cuota.fecha,
                fechaVencimiento: cuota.fechaVencimiento,

                diasPendientes: moment(cuota.fecha).diff(moment(filtro.fechaPendientesAl), 'days'),
                diasVencidos: moment(cuota.fechaVencimiento).diff(moment(filtro.fechaPendientesAl), 'days'),

                montoCuota: cuota.monto,
                montoPorPagar: 0,
                saldo1: 0,

                montoCobrado: 0,
                montoCobradoMismaMoneda: null,

                montoPagado: 0,
                montoPagadoMismaMoneda: null,
                montoPagadoCompleto: null,

                saldo2: 0,

                user: this.userId,
                cia: cuota.cia
            };

            // determinamos el monto cobrado y si se hizo con la misma moneda de la cuota  ...
            if (Array.isArray(cuota.pagos) && cuota.pagos.length) {
                cuotaPendiente.montoCobrado = lodash.sumBy(cuota.pagos, 'monto');
                cuotaPendiente.montoCobradoMismaMoneda = !lodash.some(cuota.pagos, (x) => { return x.moneda != cuota.moneda; });
            }

            Cuotas.find({
                'source.entityID': cuota.source.entityID,
                'source.subEntityID': cuota.source.subEntityID,
                'numero': cuota.numero,
                monto: { $lt: 0},
            },
            { fields: { monto: 1 }} ).
            forEach((cuotaPago) => {
                cuotaPendiente.montoPorPagar += cuotaPago.monto;

                // determinamos el monto pagado y si se hizo con la misma moneda de la cuota  ...
                if (Array.isArray(cuotaPago.pagos) && cuotaPago.pagos.length) {
                    cuotaPendiente.montoPagado += lodash.sumBy(cuotaPago.pagos, 'monto');

                    if (cuotaPendiente.montoPagadoMismaMoneda == null) {
                        if (!lodash.some(cuotaPago.pagos, (x) => { return x.moneda != cuota.moneda; })) {
                            // si alguno de los pagos, en el array de pagos, fue hecho con una moneda diferente,
                            // ponemos el flag en false (y no volvemos a revisar más)
                            cuotaPendiente.montoPagadoMismaMoneda = false;
                        }
                    }

                    if (cuotaPendiente.montoPagadoCompleto == null) {
                        if (!lodash.some(cuotaPago.pagos, (x) => { return x.completo; })) {
                            // si alguno de los pagos, en el array de pagos, no tiene 'completo',
                            // ponemos el flag en false (y no volvemos a revisar más)
                            cuotaPendiente.montoPagadoCompleto = false;
                        }
                    }
                }
                else {
                    // si alguna cuota de pago no tiene pagos, ya consideramos el flag 'completo' en false ...
                    cuotaPendiente.montoPagadoCompleto = false;
                }
            })

            // si leímos algunos pagos y no pusimos el flag en 'false', consideramos que todos se hicieron con la misma moneda
            if (cuotaPendiente.montoPagado != 0 && cuotaPendiente.montoPagadoMismaMoneda == null) {
                cuotaPendiente.montoPagadoMismaMoneda = true;
            }

            // si leímos algunos pagos y no pusimos el flag en 'false', consideramos que todos se hicieron en forma completa
            if (cuotaPendiente.montoPagado != 0 && cuotaPendiente.montoPagadoCompleto == null) {
                cuotaPendiente.montoPagadoCompleto = true;
            }

            // nótese como los montos por cobrar, por pagar, cobrado, etc., ya vienen con sus signos. Siempre, un monto a cobrar,
            // a nuestro favor, es positivo; un monto a pagar, en nuestra contra, es negativo ...
            cuotaPendiente.saldo1 = cuotaPendiente.montoCuota + cuotaPendiente.montoPorPagar;

            cuotaPendiente.saldo2 = cuotaPendiente.montoCuota + cuotaPendiente.montoCobrado +
                                    cuotaPendiente.montoPorPagar + cuotaPendiente.montoPagado;

            // finalmente, actualizamos la cantidad de e-mails enviados antes
            if (cuota.emailsEnviados && cuota.emailsEnviados.length) {
                cuotaPendiente.cantEmailsEnviadosAntes = cuota.emailsEnviados.length;
            }

            Consulta_MontosPendientesCobro_Vencimientos.insert(cuotaPendiente);
            cantidadRegistrosAgregados++;

            // -------------------------------------------------------------------------------------------------------
            // vamos a reportar progreso al cliente; solo 25 veces ...
            cantidadRecs++;
            if (numberOfItems <= 25) {
                // hay menos de 20 registros; reportamos siempre ...
                eventData = {
                              current: currentProcess, max: numberOfProcess,
                              progress: numeral(cantidadRecs / numberOfItems).format("0 %"),
                              message: message
                            };
                Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
            }
            else {
                reportar++;
                if (reportar === reportarCada) {
                    eventData = {
                                  current: currentProcess, max: numberOfProcess,
                                  progress: numeral(cantidadRecs / numberOfItems).format("0 %"),
                                  message: message
                                };
                    Meteor.call('eventDDP_matchEmit', eventName, eventSelector, eventData);
                    reportar = 0;
                }
            }
            // -------------------------------------------------------------------------------------------------------
        }

        return "Ok, el proceso se ha ejecutado en forma satisfactoria.<br /><br />" +
               "En total, " + cantidadRegistrosAgregados.toString() + 
               " registros han sido seleccionados y conforman esta consulta.";
    }
})