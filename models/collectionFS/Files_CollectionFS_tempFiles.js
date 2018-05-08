

let filesPath = Meteor.settings.public.collectionFS_path_tempFiles;

CollectionFS_tempFiles = new FS.Collection("collectionFS_tempFiles", {
  stores: [new FS.Store.FileSystem("collectionFS_tempFiles", { path: filesPath })],
  // filter: {
  //   allow: {
  //     contentTypes: ['image/*']
  //   }
  // }
});

if (Meteor.isServer) {
    CollectionFS_tempFiles.allow({
    download: function () {
      return true;
    }
  });
};

// al menos por ahora esto no es neceasario, pues estos files en 'temp' serán
// accedidos *solo* desde el servidor ...

// if (Meteor.isServer) {
//     Files_CollectionFS_Templates.allow({
//     insert: function (userId) {
//       return (userId ? true : false);
//     },
//     remove: function (userId) {
//       return (userId ? true : false);
//     },
//     download: function () {
//       return true;
//     },
//     update: function (userId) {
//       return (userId ? true : false);
//     }
//   });
// };
