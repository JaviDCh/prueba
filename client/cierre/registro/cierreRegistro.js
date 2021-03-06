
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo';

import angular from 'angular'; 

import numeral from 'numeral';
import moment from 'moment';
import lodash from 'lodash';
import { mensajeErrorDesdeMethod_preparar } from '../../imports/generales/mensajeDeErrorDesdeMethodPreparar'; 

import { CierreRegistro } from '/imports/collections/cierre/registroCierre'; 
import { Monedas } from '/imports/collections/catalogos/monedas'; 
import { Companias } from '/imports/collections/catalogos/companias'; 
import { Filtros } from '/imports/collections/otros/filtros'; 

import { DialogModal } from '../../imports/generales/angularGenericModal'; 

angular.module("scrwebm")
       .controller("Cierre.Registro.Controller", ['$scope', '$modal', '$interval', function ($scope, $modal, $interval) {

      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.processProgress = {
        current: 0,
        max: 0,
        progress: 0,
        message: ''
    }

    // -------------------------------------------------------------------------------------------------------
    // para recibir los eventos desde la tarea en el servidor ...
    EventDDP.setClient({ myuserId: Meteor.userId(), app: 'scrwebm', process: 'cierre_procesoCierre' });
    EventDDP.addListener('cierre_procesoCierre_reportProgress', function(process) {
        $scope.processProgress.current = process.current;
        $scope.processProgress.max = process.max;
        $scope.processProgress.progress = process.progress;
        $scope.processProgress.message = process.message ? process.message : null;
        // if we don't call this method, angular wont refresh the view each time the progress changes ...
        // until, of course, the above process ends ...
        $scope.$apply();
    });
    // -------------------------------------------------------------------------------------------------------

    $scope.$parent.tituloState = "Cierre - Edici??n/consulta del registro"; 

    // para usar en el filtro, para que el usuario seleccione por tipo 
    $scope.tipo_list = [
        { tipo: "", descripcion: "Todos" },
        { tipo: "A", descripcion: "Autom??ticos" },
        { tipo: "M", descripcion: "Manuales" },
    ];

    // para usar en el ui-grid, cuando el usuario edita un registro 
    $scope.tiposArray = [
        { tipo: "A", descripcion: "Auto" },
        { tipo: "M", descripcion: "Man" },
    ];

    $scope.tiposNegocio = [
        { tipo: "Prop", descripcion: "Prop" },
        { tipo: "NoProp", descripcion: "NoProp" },
        { tipo: "Fac", descripcion: "Fac" },
        { tipo: "Otro", descripcion: "Otro" },
    ];

    $scope.cobroPago_list = [
        { value: null, descripcion: "Todos" },
        { value: "cobros/pagos", descripcion: "Cobros o pagos" },
        { value: "montos", descripcion: "Montos emitidos" },
    ];

    $scope.categorias_list = [
        { value: null, descripcion: "" },
        { value: "Prima", descripcion: "Prima" },
        { value: "Sin", descripcion: "Sin" },
        { value: "Saldo", descripcion: "Saldo" },
        { value: "Cobro", descripcion: "Cobro" },
        { value: "Pago", descripcion: "Pago" },
        { value: "ComAdic", descripcion: "Comisi??n adicional" },
        { value: "PartBeneficios", descripcion: "Part beneficios" },
        { value: "RetCartPr", descripcion: "Ret cart primas" },
        { value: "EntCartPr", descripcion: "Ent cart primas" },
        { value: "RetCartSn", descripcion: "Ret cart Sin" },
        { value: "EntCartSn", descripcion: "Ent cart sin" },

    ];

    $scope.helpers({
        companias: () => {
            return Companias.find({}, { sort: { nombre: 1 } });
        },
        cedentes: () => {
            return Companias.find({ tipo: "SEG", }, { sort: { nombre: 1 } });
        },
        monedas: () => {
            return Monedas.find({}, { sort: { descripcion: 1 } });
        },
    });


    // este es el tab 'activo' en angular bootstrap ui ...
    // NOTA IMPORTANTE: esta propiedad cambio a partir de 1.2.1 en angular-ui-bootstrap. Sin embargo, parece que
    // atmosphere no tiene esta nueva versi??n (se qued?? en 0.13.0) y no pudimos instalarla desde NPM. La verdad,
    // cuando podamos actualizar angular-ui-bootstrap a una nueve vesi??n, la propiedad 'active' va en el tabSet
    // y se actualiza con el index de la p??gina (0, 1, 2, ...). As?? resulta mucho m??s intuitivo y f??cil
    // establecer el tab 'activo' en ui-bootstrap ...
    $scope.activeTab = { tab1: true, tab2: false, tab3: false, };

    let registro_ui_grid_api = {};

    let angularInterval = null;           // para detener el interval que usamos m??s abajo

    $scope.registro_ui_grid = {

        enableSorting: true,
        showColumnFooter: false,
        showGridFooter: true,
        enableCellEdit: false,
        enableCellEditOnFocus: true,
        enableFiltering: false,
        enableRowSelection: true,
        enableRowHeaderSelection: false,
        multiSelect: false,
        enableSelectAll: false,
        selectionRowHeaderWidth: 0,
        rowHeight: 25,

        onRegisterApi: function (gridApi) {

        registro_ui_grid_api = gridApi;
            // -----------------------------------------------------------------------------------------------------
            // cuando el ui-grid est?? en un bootstrap tab y tiene m??s columnas de las que se pueden ver,
            // al hacer horizontal scrolling los encabezados no se muestran sincronizados con las columnas;
            // lo que sigue es un 'workaround'
            // -----------------------------------------------------------------------------------------------------
            angularInterval = $interval(function() {
                registro_ui_grid_api.core.handleWindowResize();
            }, 200)

            // marcamos el contrato como actualizado cuando el usuario edita un valor
            gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                if (newValue != oldValue) { 
                    if (!rowEntity.docState) { 
                        rowEntity.docState = 2;
                    }
                }
            })
        },
        // para reemplazar el field '$$hashKey' con nuestro propio field, que existe para cada row ...
        rowIdentity: function (row) {
            return row._id;
        },
        getRowIdentity: function (row) {
            return row._id;
        }
    }

    // para detener el angular $Interval que usamos en el ui-gris arriba, cuando el $scope es destruido ...
    $scope.$on('$destroy', function() {
        // Make sure that the interval is destroyed too
        $interval.cancel(angularInterval);
    })

    $scope.registro_ui_grid.columnDefs = [
        {
            name: 'docState',
            field: 'docState',
            displayName: '',
            cellClass: 'ui-grid-centerCell',
            cellTemplate:
            '<span ng-show="row.entity[col.field] == 1" class="fa fa-asterisk" style="color: blue; font: xx-small; padding-top: 8px; "></span>' +
            '<span ng-show="row.entity[col.field] == 2" class="fa fa-pencil" style="color: brown; font: xx-small; padding-top: 8px; "></span>' +
            '<span  ng-show="row.entity[col.field] == 3" class="fa fa-trash" style="color: red; font: xx-small; padding-top: 8px; "></span>',
            enableColumnMenu: false,
            enableSorting: false,
            pinnedLeft: true,
            width: 25
        },
        {
            name: 'fecha',
            field: 'fecha',
            displayName: 'Fecha',
            width: '120',
            enableFiltering: false,
            enableCellEdit: true,
            cellFilter: 'dateFilter',
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',
            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'date'
        },
        {
            name: 'moneda',
            field: 'moneda',
            displayName: 'Mon',
            width: '80',
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: '_id',
            editDropdownValueLabel: 'simbolo',
            editDropdownOptionsArray: $scope.monedas,
            cellFilter: 'mapDropdown:row.grid.appScope.monedas:"_id":"simbolo"',

            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'string'
        },
        {
            name: 'compania',
            field: 'compania',
            displayName: 'Compa????a',
            width: 100,
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: '_id',
            editDropdownValueLabel: 'abreviatura',
            editDropdownOptionsArray: $scope.companias,
            cellFilter: 'mapDropdown:row.grid.appScope.companias:"_id":"abreviatura"',

            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'string'
        },
        {
            name: 'cedente',
            field: 'cedente',
            displayName: 'Cedente',
            width: 100,
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: '_id',
            editDropdownValueLabel: 'abreviatura',
            editDropdownOptionsArray: $scope.companias,
            cellFilter: 'mapDropdown:row.grid.appScope.companias:"_id":"abreviatura"',

            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'string'
        },
        {
            name: 'tipo',
            field: 'tipo',
            displayName: 'Tipo',
            width: 60,
            enableFiltering: true,
            enableCellEdit: false, 
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: 'tipo',
            editDropdownValueLabel: 'descripcion',
            editDropdownOptionsArray: $scope.tiposArray,
            cellFilter: 'mapDropdown:row.grid.appScope.tiposArray:"tipo":"descripcion"',

            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'string'
        },
        {
            name: 'origen',
            field: 'origen',
            displayName: 'Origen',
            width: '80',
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',
            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'string'
        },
        {
            name: 'cobroPagoFlag',
            field: 'cobroPagoFlag',
            displayName: 'Cob/Pag',
            width: '80',
            enableCellEdit: true,
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',
            cellFilter: 'boolFilter', 
            enableColumnMenu: false,
            enableSorting: true,
            pinnedLeft: true,
            type: 'boolean'
        },
        {
            name: 'referencia',
            field: 'referencia',
            displayName: 'Referencia',
            width: 160,
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',
            enableColumnMenu: false,
            enableSorting: true,
            type: 'string'
        },
        {
            name: 'tipoNegocio',
            field: 'tipoNegocio',
            displayName: 'Negocio',
            width: 80,
            enableFiltering: true,
            enableCellEdit: true, 
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: 'tipo',
            editDropdownValueLabel: 'descripcion',
            editDropdownOptionsArray: $scope.tiposNegocio,
            cellFilter: 'mapDropdown:row.grid.appScope.tiposNegocio:"tipo":"descripcion"',

            enableColumnMenu: false,
            enableSorting: true,
            type: 'string'
        },
        {
            name: 'categoria',              
            field: 'categoria',
            displayName: 'Cat',
            width: 60,
            enableFiltering: true,
            enableCellEdit: true, 
            headerCellClass: 'ui-grid-centerCell',
            cellClass: 'ui-grid-centerCell',

            editableCellTemplate: 'ui-grid/dropdownEditor',
            editDropdownIdLabel: 'value',
            editDropdownValueLabel: 'descripcion',
            editDropdownOptionsArray: $scope.categorias_list,
            cellFilter: 'mapDropdown:row.grid.appScope.categorias_list:"value":"descripcion"',

            enableColumnMenu: false,
            enableSorting: true,
            type: 'string'
        },
        {
            name: 'serie',
            field: 'serie',
            displayName: 'Serie',
            width: 60,
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',
            enableColumnMenu: false,
            enableSorting: true,
            type: 'number'
        },
        {
            name: 'descripcion',
            field: 'descripcion',
            displayName: 'Descripcion',
            width: 220,
            enableFiltering: true,
            enableCellEdit: true,
            headerCellClass: 'ui-grid-leftCell',
            cellClass: 'ui-grid-leftCell',
            enableColumnMenu: false,
            enableSorting: true,
            type: 'string'
        },
        {
            name: 'monto',
            field: 'monto',
            displayName: 'Monto',
            cellFilter: 'currencyFilter',
            width: 100,
            headerCellClass: 'ui-grid-rightCell',
            cellClass: 'ui-grid-rightCell',
            enableSorting: false,
            enableColumnMenu: false,
            enableCellEdit: true,
            type: 'number'
        },
        {
            name: 'delButton',
            displayName: '',
            cellTemplate: '<span ng-click="grid.appScope.deleteItem(row.entity)" class="fa fa-close redOnHover" style="padding-top: 8px; "></span>',
            enableCellEdit: false,
            enableSorting: false,
            width: 25
        },
    ]

    $scope.deleteItem = function (item) {

        if (item.docState && item.docState === 1) {
            // si el item es nuevo, simplemente lo eliminamos del array
            lodash.remove($scope.registro, (x) => { return x._id === item._id; });
        }
        else {
            item.docState = 3;
        }
    }

    $scope.nuevo = function () {
        $scope.registro.push({
            _id: new Mongo.ObjectID()._str,
            fecha: new Date(), 
            tipo: "M",
            cobroPagoFlag: false, 
            monto: 0,  
            usuario: Meteor.user().emails[0].address,
            ingreso: new Date(),
            ultAct: new Date(),
            cia: $scope.companiaSeleccionada._id,
            docState: 1
        });
    }

    // para limpiar el filtro, simplemente inicializamos el $scope.filtro ...
    $scope.limpiarFiltro = function () {
        $scope.filtro = {};
    }

    let filtroConstruido = { }; 
    let filtroConstruidoMasPeriodo = { };       // con el per??odo incluido, ya para usar en minimongo (client) 

    $scope.aplicarFiltro = function () {
        $scope.showProgress = true;

        $scope.filtro.cia = $scope.companiaSeleccionada._id; 

        // ------------------------------------------------------------------------------------------------------
        // guardamos el filtro indicado por el usuario
        if (Filtros.findOne({ nombre: 'cierres.registro', userId: Meteor.userId() })) { 
            // el filtro exist??a antes; lo actualizamos
            // validate false: como el filtro puede ser vac??o (ie: {}), simple schema no permitir??a eso; por eso saltamos la validaci??n
            Filtros.update(Filtros.findOne({ nombre: 'cierres.registro', userId: Meteor.userId() })._id,
            { $set: { filtro: $scope.filtro } },
            { validate: false });
        }
        else { 
            Filtros.insert({
                _id: new Mongo.ObjectID()._str,
                userId: Meteor.userId(),
                nombre: 'cierres.registro',
                filtro: $scope.filtro
            });
        }

        filtroConstruido = construirFiltro($scope.filtro); 
        filtroConstruidoMasPeriodo = agregarPeriodoAlFiltro(filtroConstruido); 

        // ------------------------------------------------------------------------------------------------------
        // limit es la cantidad de items en la lista; inicialmente es 50; luego avanza de 50 en 50 ...
        leerPrimerosRegistrosDesdeServidor(50, filtroConstruido);

        // n??tese como establecemos el tab 'activo' en ui-bootstrap; ver nota arriba acerca de ??sto ...
        $scope.activeTab = { tab1: false, tab2: true, tab3: true };
    }

    // ------------------------------------------------------------------------------------------------------
    // si hay un filtro anterior, lo usamos
    // los filtros (solo del usuario) se publican en forma autom??tica cuando se inicia la aplicaci??n
    $scope.filtro = {};
    var filtroAnterior = Filtros.findOne({ nombre: 'cierres.registro', userId: Meteor.userId() });

    if (filtroAnterior) { 
        $scope.filtro = lodash.clone(filtroAnterior.filtro);
    }
    // ------------------------------------------------------------------------------------------------------

    $scope.registro_ui_grid.data = [];

    let recordCount = 0;
    let limit = 0;

    function leerPrimerosRegistrosDesdeServidor(cantidadRecs, filtroConstruido) {
        // cuando el usuario indica y aplica un filtro, leemos los primeros 50 registros desde mongo ...
        limit = cantidadRecs;
        Meteor.call('getCollectionCount', 'CierreRegistro', filtroConstruido, (err, result) => {

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

            // el m??todo regresa la cantidad de items en el collection (siempre para el usuario)
            recordCount = result;
            $scope.leerRegistrosDesdeServer(limit, filtroConstruido);
        })
    }

    let subscriptionHandle = {};
    $scope.leerRegistrosDesdeServer = function (limit, filtroConstruido) {
        // la idea es 'paginar' los registros que se suscriben, de 50 en 50
        // el usuario puede indicar 'mas', para leer 50 m??s; o todos, para leer todos los registros ...
        $scope.showProgress = true;

        // lamentablemente, tenemos que hacer un stop al subscription cada vez que hacemos una nueva,
        // pues el handle para cada una es diferente; si no vamos deteniendo cada una, las anteriores
        // permanecen pues solo detenemos la ??ltima al destruir el stop (cuando el usaurio sale de
        // la p??gina). Los documents de subscriptions anteriores permanecen en minimongo y el reactivity
        // de los subscriptions tambi??n ...
        if (subscriptionHandle && subscriptionHandle.stop) {
            subscriptionHandle.stop();
        }

        $scope.registro_ui_grid.data = [];
        $scope.registro = [];

        subscriptionHandle =
        Meteor.subscribe('cierre.leerRegistro', filtroConstruido, limit, () => {

            $scope.helpers({
                registro: () => {
                    return CierreRegistro.find(filtroConstruidoMasPeriodo, { sort: { fecha: 1, moneda: 1, compania: 1, }});
                }
            });

            $scope.registro_ui_grid.data = $scope.registro;

            let message = `${numeral($scope.registro.length).format('0,0')} registros
            (<b>de ${numeral(recordCount).format('0,0')}</b>) han sido seleccionados ...`; 
            message = message.replace(/\/\//g, '');     // quitamos '//' del query; typescript agrega estos caracteres??? 

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'info',
                msg: message, 
            });

            $scope.showProgress = false;
            $scope.$apply();
        });
    }

    $scope.leerMasRegistros = function () {
        limit += 50;    // la pr??xima vez, se leer??n 50 m??s ...
        $scope.leerRegistrosDesdeServer(limit, filtroConstruido);     // cada vez se leen 50 m??s ...
    }

    $scope.leerTodosLosRegistros = function () {
        // simplemente, leemos la cantidad total de registros en el collection (en el server y para el user)
        limit = recordCount;
        $scope.leerRegistrosDesdeServer(limit, filtroConstruido);     // cada vez se leen 50 m??s ...
    }

    // -------------------------------------------------------------------------
    // Grabar las modificaciones hechas al registro
    // -------------------------------------------------------------------------
    $scope.grabar = function () {

        const hayEdiciones = lodash.some($scope.registro, (x) => { 
            return x.docState; 
        }); 

        if (!hayEdiciones) {
            const message = `Aparentemente, <em>no se han efectuado cambios</em> en el registro. No hay nada que grabar.`; 
            
            DialogModal($modal, "<em>Cierre - Registro</em>", message, false).then();
            return;
        }

        const hayEdicionesRegTipoAuto = lodash.some($scope.registro, (x) => x.docState && x.tipo === "A"); 

        if (hayEdicionesRegTipoAuto) {
            const message = `Aparentemente, Ud. ha editado o eliminado registros de tipo <em>Auto</em>.<br /> 
                             Los registros de tipo <em>Auto</em> debe ser <b>solo</b> afectados por el proceso de cierre; 
                             nunca deben ser editados en forma directa por el usuario. 
                            `; 
            
            DialogModal($modal, "<em>Cierre - Registro</em>", message, false).then();
            return;
        }

        grabar2();
    }


    function grabar2() {
        $scope.showProgress = true;

        // obtenemos un clone de los datos a guardar ...
        const editedItems = lodash.filter($scope.registro, (x) => { return x.docState; });

        // n??tese como validamos cada item antes de intentar guardar en el servidor
        let isValid = false;
        const errores = [];

        editedItems.forEach((item) => { 
            if (item.docState != 3) {
                isValid = CierreRegistro.simpleSchema().namedContext().validate(item);
    
                if (!isValid) {
                    CierreRegistro.simpleSchema().namedContext().validationErrors().forEach((error) => {
                        if (error.type === "custom") { 
                            // cuando pasamos errores del tipo custom es porque el error no corresponde a un field en particular, sino a 
                            // todo el registro. En un caso tal, mostramos solo el nombre (name), pues all?? ponemos la descripci??n del error 
                            errores.push(`${error.name}`);
                        } else { 
                            errores.push(`El valor '${error.value}' no es adecuado para el campo '${CierreRegistro.simpleSchema().label(error.name)}'; error de tipo '${error.type}'.`);
                        }
                    });
                }
            }
        })

        if (errores && errores.length) {

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'danger',
                msg: "Se han encontrado errores al intentar guardar las modificaciones efectuadas en la base de datos:<br /><br />" +
                    errores.reduce(function (previous, current) {

                        if (previous == "")
                            // first value
                            return current;
                        else
                            return previous + "<br />" + current;
                    }, "")
            });

            $scope.showProgress = false;
            return;
        }

        $scope.registro_ui_grid.data = [];
        $scope.registro = [];

        Meteor.call('cierreRegistro.save', editedItems, (err, result) => {

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

            if (result.error) {
                $scope.alerts.length = 0;
                $scope.alerts.push({
                    type: 'danger',
                    msg: result.message
                });
                $scope.showProgress = false;
                $scope.$apply();

                return; 
            } 

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'info',
                msg: result.message
            });

            // refrescamos el helper 
            $scope.helpers({
                registro: () => {
                    return CierreRegistro.find(filtroConstruido, { sort: { fecha: 1, moneda: 1, compania: 1, }});
                }
            });

            $scope.registro_ui_grid.data = $scope.registro;

            $scope.showProgress = false;
            $scope.$apply();
        })
    }


     // ------------------------------------------------------------------------------------------------------
     // para recibir los eventos desde la tarea en el servidor ...
     EventDDP.setClient({ myuserId: Meteor.userId(), app: 'bancos', process: 'leerBancosProveedoresDesdeSqlServer' });
     EventDDP.addListener('bancos_proveedores_reportProgressDesdeSqlServer', function(process) {

         $scope.processProgress.current = process.current;
         $scope.processProgress.max = process.max;
         $scope.processProgress.progress = process.progress;
         // if we don't call this method, angular wont refresh the view each time the progress changes ...
         // until, of course, the above process ends ...
         $scope.$apply();
     });
     // ------------------------------------------------------------------------------------------------------

     // para leer el ??ltimo cierre efectuado 
     $scope.showProgress = true;
     const ultimoCierre_subscriptionHandle = Meteor.subscribe('utimoPeriodoCerrado', $scope.companiaSeleccionada._id , () => { 
        $scope.showProgress = false;
    })

    // ------------------------------------------------------------------------------------------------
     // cuando el usuario sale de la p??gina, nos aseguramos de detener (ie: stop) el subscription,
     // para limpiar los items en minimongo ...
     $scope.$on('$destroy', function() {
         if (subscriptionHandle && subscriptionHandle.stop) {
             subscriptionHandle.stop();
         }

         ultimoCierre_subscriptionHandle.stop(); 
     })
}
])

// construimos el filtro en el cliente, pues lo usamos en varias partes en este c??digo y debe estar disponible. 
// nota: en otras funciones similares, se filtran los registros en el servidor y se graban a un collection 'temporal' 
// para el usuario. En estos casos, posteriormente no se usa m??s el filtro, pues solo basta con leer los records para 
// el usuario. No es as?? en este caso, que se leen y regresan los records desde el collection original, sin que medie 
// ning??n collection 'temporal' ... 
function construirFiltro(criterioSeleccion) { 

    // construimos el filtro en base a todos los criterios indicados; menos el per??odo, pues lo pasamos al method en el server 
    // para construirlo all?? ... 
    const filtro = {
        fecha1: criterioSeleccion.fecha1, 
        fecha2: criterioSeleccion.fecha2
    }

    if (criterioSeleccion.tipo) { 
        filtro.tipo = criterioSeleccion.tipo; 
    }

    if (criterioSeleccion.cobroPagoFlag) { 
        switch (criterioSeleccion.cobroPagoFlag) { 
            case "cobros/pagos": { 
                filtro.cobroPagoFlag = { $eq: true };
                break; 
            }
            case "montos": { 
                filtro.cobroPagoFlag = { $eq: false };
                break; 
            }
        }
    }

    if (criterioSeleccion.tipoNegocio && Array.isArray(criterioSeleccion.tipoNegocio) && criterioSeleccion.tipoNegocio.length) {
        const array = lodash.clone(criterioSeleccion.tipoNegocio);
        filtro.tipoNegocio = { $in: array };
    }

    if (criterioSeleccion.compania && Array.isArray(criterioSeleccion.compania) && criterioSeleccion.compania.length) {
        const array = lodash.clone(criterioSeleccion.compania);
        filtro.compania = { $in: array };
    }

    if (criterioSeleccion.cedente && Array.isArray(criterioSeleccion.cedente) && criterioSeleccion.cedente.length) {
        const array = lodash.clone(criterioSeleccion.cedente);
        filtro.cedente = { $in: array };
    }

    if (criterioSeleccion.moneda && Array.isArray(criterioSeleccion.moneda) && criterioSeleccion.moneda.length) {
        const array = lodash.clone(criterioSeleccion.moneda);
        filtro.moneda = { $in: array };
    }

    if (criterioSeleccion.referencia) { 
        const search = new RegExp(criterioSeleccion.referencia, 'i');
        filtro.referencia = search;
    }

    filtro.cia = criterioSeleccion.cia; 

    return filtro; 
}

function agregarPeriodoAlFiltro(filtro) { 
    let { fecha1, fecha2 } = filtro; 

    fecha1 = moment(fecha1).isValid() ? moment(fecha1).toDate() : null; 
    fecha2 = moment(fecha2).isValid() ? moment(fecha2).toDate() : null; 

    // la fecha final del per??odo debe ser el ??ltimo momento del d??a, para que incluya cualquier fecha de ese d??a 
    fecha2 = fecha2 ? new Date(fecha2.getFullYear(), fecha2.getMonth(), fecha2.getDate(), 23, 59, 59) : null; 

    const fecha = {}; 

    if (fecha1) { 
        if (fecha2) {
            // las fechas vienen como strings ... 
            fecha.$gte = fecha1;
            fecha.$lte = fecha2;
        }
        else { 
            fecha.$eq = fecha1;
        }
    }

    const filtro2 = { ...filtro, fecha }; 

    delete filtro2.fecha1; 
    delete filtro2.fecha2; 

    return filtro2; 
}