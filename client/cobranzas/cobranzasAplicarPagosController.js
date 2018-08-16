﻿

import lodash from 'lodash'; 
import numeral from 'numeral'; 
import moment from 'moment'; 
import { mensajeErrorDesdeMethod_preparar } from '/client/imports/generales/mensajeDeErrorDesdeMethodPreparar'; 

import { Monedas } from '/imports/collections/catalogos/monedas'; 
import { Companias } from '/imports/collections/catalogos/companias'; 
import { Remesas } from '/imports/collections/principales/remesas';  

import { DialogModal } from '/client/imports/generales/angularGenericModal'; 

angular.module("scrwebM").controller("CobranzasAplicarPagosController",
['$scope', '$state', '$stateParams', '$modal', function ($scope, $state, $stateParams, $modal) {

    $scope.showProgress = false;

    // ui-bootstrap alerts ...
    $scope.alerts = [];

    $scope.closeAlert = function (index) {
        $scope.alerts.splice(index, 1);
    }

    let remesaSeleccionada = null; 

    var remesaSeleccionadaPK = $stateParams.remesaPK;

    if (remesaSeleccionadaPK) {

        $scope.showProgress = true;

        remesaSeleccionada = Remesas.findOne({ _id: remesaSeleccionadaPK });

        Meteor.call('cobranzas.determinarCuotasPendientesCompaniaRemesaSeleccionada', remesaSeleccionada._id, (err, result)  => {

            if (err) {
                let errorMessage = mensajeErrorDesdeMethod_preparar(err);

                $scope.alerts.length = 0;
                $scope.alerts.push({
                    type: 'danger',
                    msg: errorMessage
                });

                $scope.showProgress = false;
                $scope.$apply();

                return;
            }

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'info',
                msg: `${result}.<br />
                        Ahora, Ud. debe seleccionar las cuotas a pagar y hacer un
                        <em>click</em> en el botón <em>Aplicar pagos</em>`
            });

            // Ok, ahora que el 'method' en el servidor agregó los items a la tabla, hacemos un subscribe para tener estos items en el cliente ...
            // nótese solo se publicarán documentos que correspondan al usuario
            Meteor.subscribe('temp_cobranzas', () => { 

                // $scope.temp_cobranzas = $scope.$meteorCollection(Temp_Cobranzas, false)
                $scope.temp_cobranzas = Temp_Cobranzas.find({ usuario: Meteor.userId() },
                                                            { sort: { 'cuota.fecha': 1, 'origen.numero': 1 }}).
                                                        fetch();
                $scope.showProgress = false;
                $scope.$apply(); 
            })
        })
    }

    $scope.opcionesSeleccionarCuotas = [
        { tipo: true, descripcion: 'Seleccionadas' },
        { tipo: false, descripcion: 'No seleccionadas' },
        { tipo: '', descripcion: 'Todas' }, 
    ];

    $scope.regresarStateAnterior = function () {
        $state.go('cobranzas.seleccionRemesa');
    }

    $scope.seleccionarCuotasPagadas = function() { 
        // permitimos al usuario ver solo cuotas seleccionadas (ie: marcadas), por seleccionar o todas ... 
        switch($scope.seleccionarMarcadas) { 
            case "SE": {
                break; 
            }
            case "NS": {
                break; 
            }
            default: {
                // $scope.filterCuotaMarcada = { }
                break; 
            }
        }
    }

    $scope.aplicarPagos = function () {

        if (!$scope.temp_cobranzas) {
            var promise = DialogModal($modal,
                                    "<em>Cobranzas</em>",
                                    `Aparentemente, Ud. no ha seleccionado pagos a ser aplicados.<br />
                                        Ud. debe seleccionar al menos un pago a ser aplicado por este proceso,
                                        para la remesa seleccionada.`,
                                    false).then();

            return;
        }

        var pagosAAplicar = lodash.filter($scope.temp_cobranzas, function (cuota) { return cuota.pagar; });

        if (pagosAAplicar.length == 0) {
            var promise = DialogModal($modal,
                                    "<em>Cobranzas</em>",
                                    `Aparentemente, Ud. no ha seleccionado pagos a ser aplicados.<br />
                                        Ud. debe seleccionar al menos un pago a ser aplicado por este proceso, para
                                        la remesa seleccionada.`,
                                    false).then();

            return;
        }

        $scope.showProgress = true;

        // construimos un array que contendrá solo los datos que el método necesita para aplicar los pagos ...
        var pagosAAplicar2 = [];

        pagosAAplicar.forEach(function (item) {
            var pagoAAplicar = {
                cuotaID: item.cuota.cuotaID,
                monto: item.monto,
                completo: item.completo
            };

            pagosAAplicar2.push(pagoAAplicar);
        })

        Meteor.call('cobranzas.grabarPagosIndicadosParaCuotasSeleccionadas', remesaSeleccionada._id, pagosAAplicar2, (err, result)  => {

            if (err) {
                let errorMessage = mensajeErrorDesdeMethod_preparar(err);

                $scope.alerts.length = 0;
                $scope.alerts.push({
                    type: 'danger',
                    msg: errorMessage
                });

                $scope.showProgress = false;
                $scope.$apply();

                return;
            }

            // vamos al state de Resultados
            $state.go("cobranzas.resultados", {
                remesaID: remesaSeleccionadaPK,
                cantPagos: result.cantidadPagosAplicados
            });

            $scope.showProgress = false;
            $scope.$apply();
        })
    }

    $scope.montoTotalSeleccionado = 0; 
    $scope.cantidadCuotasSeleccionadas = 0; 
    $scope.mensajeResumenRemesa = "";
    $scope.infoRemesa = ""; 

    if (remesaSeleccionada && remesaSeleccionada.instrumentoPago && remesaSeleccionada.instrumentoPago.monto) { 
        let montoRemesa = remesaSeleccionada.instrumentoPago.monto; 
        $scope.mensajeResumenRemesa = `
            Monto remesa: ${numeral(montoRemesa).format("0,0.00")} - 
            aplicado: 0,00 - 
            resta: ${numeral(montoRemesa).format("0,0.00")}. 
        `

        let compania = Companias.findOne(remesaSeleccionada.compania); 
        let moneda = Monedas.findOne(remesaSeleccionada.moneda); 

        $scope.infoRemesa = `
            Remesa #: ${remesaSeleccionada.numero.toString()} - 
                      ${moment(remesaSeleccionada.fecha).format("DD-MMM-YYYY")} - 
                      ${compania && compania.abreviatura ? compania.abreviatura : 'compañía indefinida'} - 
                      ${moneda && moneda.simbolo ? moneda.simbolo : 'moneda indefinida'} - 
                      ${remesaSeleccionada.miSu} - 
                      ${numeral(montoRemesa).format("0,0.00")}. 
        `
    }

    $scope.calcularTotalMontoAPagar = function() { 
        // para calcular y mostrar el total para el monto seleccionado en la tabla 
        let montoTotalSeleccionado = lodash($scope.temp_cobranzas).filter((x) => { return x.pagar; }).sumBy("monto"); 
        let cantidadCuotasSeleccionadas = lodash.filter($scope.temp_cobranzas, (x) => { return x.pagar; }).length; 

        $scope.montoTotalSeleccionado = montoTotalSeleccionado; 
        $scope.cantidadCuotasSeleccionadas = cantidadCuotasSeleccionadas; 

        // además del monto seleccionado, a pagar o cobrar, determinamos el resto con respecto al monto inicial de la remesa 
        if (remesaSeleccionada && remesaSeleccionada.instrumentoPago && remesaSeleccionada.instrumentoPago.monto) { 
            let montoRemesa = remesaSeleccionada.instrumentoPago.monto; 
            let montoPorAplicar = 0; 

            if (lodash.isFinite(montoTotalSeleccionado)) { 
                if (remesaSeleccionada.miSu === "MI") { 
                    // la remesa es un pago nuestro; normalmente, se seleccionarán montos positivos que cancelan a los negativos
                    // que debemos (créditos). 
                    // si el montoPorAplicar queda negativo, debe indicar que el monto de la remesa se ha excedido 
                    montoPorAplicar = montoRemesa - montoTotalSeleccionado; 
                } else { 
                    // la remesa es un cobro; normalmente seleccionamos montos negativos que cancelan montos positivos (que nos 
                    // deben). Convertimos el total aplicado a positivo. Si el monto que queda por aplicar es negaivo, debe ser 
                    // que el usuario ha excedido el monto de la reemsa 
                    montoPorAplicar = montoRemesa - Math.abs(montoTotalSeleccionado); 
                }
            }

            $scope.mensajeResumenRemesa = `
                Monto remesa: ${numeral(montoRemesa).format("0,0.00")} - 
                aplicado: ${numeral(montoTotalSeleccionado).format("0,0.00")} - 
                resta: ${numeral(montoPorAplicar).format("0,0.00")}. 
            `
        }
    }

    //-------------------------------------
    // angular pagination ...
    $scope.pageSize = 10;
    $scope.currentPage = 1;
}]);
