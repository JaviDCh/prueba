
import SimpleSchema from 'simpl-schema';
import { CierreRegistro } from '/imports/collections/cierre/registroCierre'; 
import { Cierre } from '/imports/collections/cierre/cierre'; 
import { Temp_consulta_cierreRegistro } from '/imports/collections/consultas/temp_consulta_cierreRegistro'; 
import { Temp_Consulta_Riesgos } from '/imports/collections/consultas/tempConsultaRiesgos'; 

Meteor.methods({
   getCollectionCount: function (collectionName, filtro = "") {

       // agregamos este método para contar la cantidad de registros que contiene un collection;
       // Nota Importante: no usamos 'tmeasday:publish-counts' pues indica en su documentación que
       // puede ser muy ineficiente si el dataset contiene muchos registros; además, este package
       // es reactive, lo cual agregar un cierto costo a su ejecución ...

       // nota: solo a veces usamos filtro ... 

       new SimpleSchema({
           collectionName: { type: String }
         }).validate({ collectionName });

        switch (collectionName) {
            case 'Temp_Consulta_Riesgos': { 
                return Temp_Consulta_Riesgos.find({ user: this.userId }).count();
                break;
            }
            case 'Temp_Consulta_Contratos': { 
                return Temp_Consulta_Contratos.find({ user: this.userId }).count();
                break;
            } 
            case 'CierreRegistro': { 
                return CierreRegistro.find(filtro).count();
                break;
            } 
            case 'Cierre': { 
                return Cierre.find(filtro).count();
                break;
            } 
            case 'Temp_consulta_cierreRegistro': { 
                return Temp_consulta_cierreRegistro.find({ user: this.userId }).count();
                break;
            }
            default: { 
                return -9999;
            }
        }
   }
})
