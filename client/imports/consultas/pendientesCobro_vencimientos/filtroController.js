
import { Meteor } from 'meteor/meteor'; 
import { Mongo } from 'meteor/mongo';

import angular from 'angular';
import lodash from 'lodash'; 
import { mensajeErrorDesdeMethod_preparar } from '/client/imports/generales/mensajeDeErrorDesdeMethodPreparar'; 

import { EmpresasUsuarias } from '/imports/collections/catalogos/empresasUsuarias'; 
import { CompaniaSeleccionada } from '/imports/collections/catalogos/companiaSeleccionada'; 
import { Monedas } from '/imports/collections/catalogos/monedas'; 
import { Companias } from '/imports/collections/catalogos/companias'; 
import { Consulta_MontosPendientesCobro_Vencimientos } from '/imports/collections/consultas/consultas_MontosPendientesCobro_Vencimientos'; 
import { Suscriptores } from '/imports/collections/catalogos/suscriptores'; 
import { Filtros } from '/imports/collections/otros/filtros'; 

import './filtro.html';

export default angular.module("scrwebm.consultas.pendientesCobro_vencimientos.filtro", [])
       .controller("ConsultasMontosPendientesCobroVencimientos_Filtro_Controller", ['$scope', '$state',
function ($scope, $state) {

    $scope.processProgress = {
        current: 0,
        max: 0,
        progress: 0,
        message: ''
    }

    // -------------------------------------------------------------------------------------------------------
    // para recibir los eventos desde la tarea en el servidor ...
    EventDDP.setClient({ myuserId: Meteor.userId(), app: 'scrwebm', process: 'montosPendientesCobro_vencimientos_consulta' });
    EventDDP.addListener('montosPendientesCobro_vencimientos_consulta_reportProgress', function(process) {
        $scope.processProgress.current = process.current;
        $scope.processProgress.max = process.max;
        $scope.processProgress.progress = process.progress;
        $scope.processProgress.message = process.message ? process.message : null;
        // if we don't call this method, angular wont refresh the view each time the progress changes ...
        // until, of course, the above process ends ...
        $scope.$apply();
    });
    // -------------------------------------------------------------------------------------------------------

    $scope.showProgress = false;

    // ui-bootstrap alerts ...
    $scope.alerts = [];

    $scope.closeAlert = function (index) {
        $scope.alerts.splice(index, 1);
    };

    // ------------------------------------------------------------------------------------------------
    // leemos la compa????a seleccionada
    const companiaSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() });
    let companiaSeleccionadaDoc = null;

    if (companiaSeleccionada) {
        companiaSeleccionadaDoc = EmpresasUsuarias.findOne(companiaSeleccionada.companiaID, { fields: { nombre: 1 } });
    }
    // ------------------------------------------------------------------------------------------------

    // leemos los cat??logos en el $scope
    $scope.monedas = Monedas.find().fetch();
    $scope.companias = Companias.find().fetch();
    $scope.suscriptores = Suscriptores.find().fetch();

    // para limpiar el filtro, simplemente inicializamos el $scope.filtro ...

    $scope.limpiarFiltro = function () {
        $scope.filtro = {};
    };

    // el usuario hace un submit, cuando quiere 'salir' de edici??n ...
    $scope.submitted = false;

    // aplicamos el filtro indicado por el usuario y abrimos la lista
    $scope.submitConstruirFiltroForm = function () {

        $scope.submitted = true;
        $scope.alerts.length = 0;

        if ($scope.construirFiltroForm.$valid) {

            if (!$scope.filtro || !$scope.filtro.fechaPendientesAl || !$scope.filtro.fechaLeerHasta) { 
                $scope.alerts.length = 0;
                $scope.alerts.push({
                    type: 'danger',
                    msg: "Ud. debe indicar un valor para <b>ambas</b> fechas: <em>pendientes al</em> y <em>leer hasta</em>.<br />" +
                            "Por favor indique un valor para las fechas mencionadas e intente nuevamente. "
                });

                return; 
            }
            
            $scope.submitted = false;
            $scope.construirFiltroForm.$setPristine();    // para que la clase 'ng-submitted deje de aplicarse a la forma ... button
        }
        else { 
            return;
        }
        
        $scope.showProgress = true;

        // preparamos el filtro (selector)
        let filtro = {};

        // agregamos la compa????a seleccionada al filtro
        filtro = $scope.filtro;
        filtro.cia = companiaSeleccionadaDoc && companiaSeleccionadaDoc._id ? companiaSeleccionadaDoc._id : -999;

        // para medir y mostrar el progreso de la tarea ...
        $scope.processProgress.current = 0;
        $scope.processProgress.max = 0;
        $scope.processProgress.progress = 0;
        $scope.processProgress.message = "";

        let Consultas_MontosPendientesCobro_Vencimientos_SubscriptionHandle = null; 

        Meteor.call('consultas_MontosPendientesCobro_Vencimientos', filtro, (err) => {

            if (err) {
                const errorMessage = mensajeErrorDesdeMethod_preparar(err);

                $scope.alerts.length = 0;
                $scope.alerts.push({
                    type: 'danger',
                    msg: errorMessage
                });

                $scope.showProgress = false;
                $scope.$apply();

                return;
            }

            // si se efectu?? un subscription al collection antes, la detenemos ...
            if (Consultas_MontosPendientesCobro_Vencimientos_SubscriptionHandle) { 
                Consultas_MontosPendientesCobro_Vencimientos_SubscriptionHandle.stop();
            }
                
            Consultas_MontosPendientesCobro_Vencimientos_SubscriptionHandle = null;

            Consultas_MontosPendientesCobro_Vencimientos_SubscriptionHandle =
            Meteor.subscribe('consulta_MontosPendientesCobro_Vencimientos', () => {

                // ------------------------------------------------------------------------------------------------------
                // guardamos el filtro indicado por el usuario
                const filtroActual = lodash.clone($scope.filtro);

                if (Filtros.findOne({ nombre: 'consultas_MontosPendientesDeCobro_vencimientos', userId: Meteor.userId() })) {
                    // el filtro exist??a antes; lo actualizamos
                    // validate false: como el filtro puede ser vac??o (ie: {}), simple schema no permitir??a eso; por eso saltamos la validaci??n
                    Filtros.update(Filtros.findOne({ nombre: 'consultas_MontosPendientesDeCobro_vencimientos', userId: Meteor.userId() })._id,
                                    { $set: { filtro: filtroActual } },
                                    { validate: false });
                }
                else {
                    Filtros.insert({
                        _id: new Mongo.ObjectID()._str,
                        userId: Meteor.userId(),
                        nombre: 'consultas_MontosPendientesDeCobro_vencimientos',
                        filtro: filtroActual
                    });
                }
                // ------------------------------------------------------------------------------------------------------

                if (Consulta_MontosPendientesCobro_Vencimientos.find({ user: Meteor.userId() }).count() == 0) {
                    $scope.alerts.length = 0;
                    $scope.alerts.push({
                        type: 'warning',
                        msg: "0 registros seleccionados. Por favor revise el <em>criterio de selecci??n</em> indicado e indique uno diferente.<br />" +
                            "(Nota: el filtro <b>solo</b> regresar?? registros si existe una <em>compa????a seleccionada</em>.)"
                    });

                    $scope.showProgress = false;
                    $scope.$apply();

                    return;
                }

                $scope.showProgress = false;

                // abrimos el state Lista ...
                const parametrosReporte =
                    {
                        fechaPendientesAl: filtro.fechaPendientesAl,
                        fechaLeerHasta: filtro.fechaLeerHasta
                    };

                $state.go('pendientesCobro_vencimientos_consulta_list',
                            {
                                companiaSeleccionada: JSON.stringify(companiaSeleccionadaDoc),
                                parametrosReporte: JSON.stringify(parametrosReporte)
                            });
            })
        })
    }

    // ------------------------------------------------------------------------------------------------------
    // si hay un filtro anterior, lo usamos
    // los filtros (solo del usuario) se publican en forma autom??tica cuando se inicia la aplicaci??n

    $scope.filtro = {};
    const filtroAnterior = Filtros.findOne({ nombre: 'consultas_MontosPendientesDeCobro_vencimientos', userId: Meteor.userId() });

    // solo hacemos el subscribe si no se ha hecho antes; el collection se mantiene a lo largo de la session del usuario
    if (filtroAnterior) {
        $scope.filtro = lodash.clone(filtroAnterior.filtro);
    }
    // ------------------------------------------------------------------------------------------------------
}])