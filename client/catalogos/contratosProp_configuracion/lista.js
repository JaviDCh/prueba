

import { DialogModal } from '/client/imports/generales/angularGenericModal'; 

import { ContratosProp_Configuracion_ListaCodigos } from '/imports/collections/catalogos/ContratosProp_Configuracion'; 

angular.module("scrwebM").controller("ContratosProp_Configuracion_Lista_Controller",
['$scope', '$state', '$stateParams', '$meteor', '$modal',
  function ($scope, $state, $stateParams, $meteor, $modal) {

      $scope.showProgress = true;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      // leemos la compañía seleccionada
      let companiaSeleccionada = $scope.$parent.companiaSeleccionada;

      // ejecutamos un método que lea los códigos de contrato que se han registrado y los regrese en una lista ...
      Meteor.call('contratosProporcionales.configuracion.leerCodigosContrato', companiaSeleccionada._id, (err, result)  => {

          if (err) {
              let errorMessage = ClientGlobal_Methods.mensajeErrorDesdeMethod_preparar(err);

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
          } else {
              let codigosContato_list = JSON.parse(result);

              // ahora que tenemos la lista, la asociamos a la columna en el ui-grid, para que la muestre
              // como lista en el ddl ...
              $scope.codigosContrato_ui_grid.columnDefs[1].editDropdownOptionsArray = codigosContato_list;

              $scope.showProgress = false;
              $scope.$apply();
              return;
          }
      })


      let itemSeleccionado = {};
      let uiGridApi = null;

      $scope.codigosContrato_ui_grid = {
          enableSorting: false,
          showColumnFooter: false,
          enableCellEdit: false,
          enableCellEditOnFocus: true,
          enableRowSelection: true,
          enableRowHeaderSelection: true,
          multiSelect: false,
          enableSelectAll: false,
          selectionRowHeaderWidth: 35,
          rowHeight: 25,
          onRegisterApi: function (gridApi) {
              uiGridApi = gridApi;

              // guardamos el row que el usuario seleccione
              gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                  itemSeleccionado = {};

                  if (row.isSelected)
                      itemSeleccionado = row.entity;
                  else
                      return;
              });
              // marcamos el item como actualizado cuando el usuario edita un valor
              gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                  if (newValue != oldValue)
                      if (!rowEntity.docState)
                          rowEntity.docState = 2;
              });
          },
          // para reemplazar el field '$$hashKey' con nuestro propio field, que existe para cada row ...
          rowIdentity: function (row) {
              return row._id;
          },
          getRowIdentity: function (row) {
              return row._id;
          },
      };

      $scope.codigosContrato_ui_grid.columnDefs = [
            {
                name: 'docState',
                field: 'docState',
                displayName: '',
                cellTemplate:
                   '<span ng-show="row.entity[col.field] == 1" class="fa fa-asterisk" style="color: blue; font: xx-small; padding-top: 8px; "></span>' +
                   '<span ng-show="row.entity[col.field] == 2" class="fa fa-pencil" style="color: brown; font: xx-small; padding-top: 8px; "></span>' +
                   '<span ng-show="row.entity[col.field] == 3" class="fa fa-trash" style="color: red; font: xx-small; padding-top: 8px; "></span>',
                enableCellEdit: false,
                enableColumnMenu: false,
                enableSorting: false,
                width: 25
            },
            {
                name: 'codigo',
                field: 'codigo',
                displayName: 'Código de contrato',
                width: 250,
                headerCellClass: 'ui-grid-leftCell',
                cellClass: 'ui-grid-leftCell',
                editableCellTemplate: 'ui-grid/dropdownEditor',
                editDropdownIdLabel: 'codigo',
                editDropdownValueLabel: 'codigo',
                editDropdownOptionsArray: $scope.$parent.codigosContato_list,
                // no necesitamos un cellFilter pues el id y descripción son el mismo en esta lista
                // cellFilter: 'mapDropdown:row.grid.appScope.monedas:"codigo":"codigo"',
                enableColumnMenu: false,
                enableCellEdit: true,
                type: 'string'
            },
            {
                name: 'delButton',
                displayName: '',
                cellTemplate: '<span ng-click="grid.appScope.deleteItem(row.entity)" class="fa fa-close redOnHover" style="padding-top: 8px; "></span>',
                enableCellEdit: false,
                enableSorting: false,
                width: 25
            }
      ];


      $scope.deleteItem = function (item) {
          item.docState = 3;
      };

      $scope.nuevo = function () {
          $scope.contratosProp_configuracion_listaCodigos.push({
              _id: new Mongo.ObjectID()._str,
              cia: companiaSeleccionada._id,
              docState: 1
          });
      };


        $scope.save = function () {
             $scope.showProgress = true;

             let editedItems = _.filter($scope.contratosProp_configuracion_listaCodigos,
                                        function (item) { return item.docState; });

             // nótese como validamos cada item antes de intentar guardar (en el servidor)
             let isValid = false;
             let errores = [];

             editedItems.forEach((item) => {
                 if (item.docState != 3) {
                     isValid = ContratosProp_Configuracion_ListaCodigos.simpleSchema().namedContext().validate(item);

                     if (!isValid) {
                         ContratosProp_Configuracion_ListaCodigos.simpleSchema().namedContext().validationErrors().forEach(function (error) {
                             errores.push("El valor '" + error.value + "' no es adecuado para el campo <b><em>" + ContratosProp_Configuracion_ListaCodigos.simpleSchema().label(error.name) + "</b></em>; error de tipo '" + error.type + ".");
                         });
                     }
                 }
             });

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
             };

             Meteor.call('contratosProp_configuracion_listaCodigos_Save', editedItems, function (error, result) {
               if (error) {

                   let errorMessage = ClientGlobal_Methods.mensajeErrorDesdeMethod_preparar(error);

                   $scope.alerts.length = 0;
                   $scope.alerts.push({
                       type: 'danger',
                       msg: errorMessage
                   });

                   $scope.showProgress = false;
                   $scope.$apply();

                   return;
               };

               // por alguna razón, que aún no entendemos del todo, si no hacemos el subscribe nuevamente,
               // se queda el '*' para registros nuevos en el ui-grid ...
               $scope.contratosProp_configuracion_listaCodigos = [];
               $scope.codigosContrato_ui_grid.data = [];
               itemSeleccionado = {};

               $scope.subscribe('contratosProp.configuracion.listaCodigos', () => [companiaSeleccionada._id], {
                   onReady: function () {
                       $scope.helpers({
                           contratosProp_configuracion_listaCodigos: () => {
                               return ContratosProp_Configuracion_ListaCodigos.find({ cia: companiaSeleccionada._id });
                           },
                       });

                       $scope.codigosContrato_ui_grid.data = $scope.contratosProp_configuracion_listaCodigos;

                       $scope.alerts.length = 0;
                       $scope.alerts.push({
                           type: 'info',
                           msg: result
                       });

                       $scope.showProgress = false;
                       $scope.$apply();
                   },
                   onStop: function(err) {
                       if (err) {
                       } else {
                       }
                   }
               })
           })
      }

      $scope.showProgress = true;
      $scope.subscribe('contratosProp.configuracion.listaCodigos', () => [companiaSeleccionada._id], {
          onReady: function () {
              $scope.helpers({
                  contratosProp_configuracion_listaCodigos: () => {
                      return ContratosProp_Configuracion_ListaCodigos.find({ cia: companiaSeleccionada._id });
                  },
              });

              $scope.codigosContrato_ui_grid.data = $scope.contratosProp_configuracion_listaCodigos;

              $scope.showProgress = false;
          },
          onStop: function(err) {
              if (err) {
              } else {
              }
          }
      });


      $scope.leerTablaConfiguracionContrato = () => {
          if (!itemSeleccionado || _.isEmpty(itemSeleccionado)) {
              DialogModal($modal,
                        "<em>Contratos - Configuración de contratos proporcionales</em>",
                        `Ud. debe seleccionar un código de contrato en la lista.`,
                        false);
              return;
          }

          if (itemSeleccionado.docState) {
              DialogModal($modal,
                        "<em>Contratos - Configuración de contratos proporcionales</em>",
                        `Aparentemente, el registro ha recibido modificaciones que no se han guardado aún.<br />
                         Ud. debe guardar los cambios efectuados en la lista antes de continuar con esta función.
                        `,
                        false);
              return;
          }

          $state.go("catalogos.contrProp_configuracion.contratosListaProp_configuracion_tabla",
                    { codigoContrato: itemSeleccionado.codigo });
      }
  }
]);
