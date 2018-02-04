const generateGUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

const cid = generateGUID();

const members = [];

for (var j = 0; j < 100000; j++) {

  var userId = "" + j;

  while (userId.length < 5) {
    userId = "0" + userId;
  }

  var user = {
    uid: "leonard_shi+dev_" + userId,
    pwd: "43f01efbad6aa7be1fc5bfd8810229a24c93ad8b",
    cid: cid
  };

  // Assign 1K user to one group.
  if (j < 1000) {
    members.push(user.uid);
  }

  db.Users.insert(user);

}

var group = {
  gid: generateGUID(),
  cid: cid,
  members: members
};

db.Groups.insert(group);

// db.Groups.update({_id: ObjectId('5808b838abcd8b7d314abb00')}, {
//   $set: {
//     cid: 'd2535cb8-565f-4736-9aa1-34320f4702c4'
//   }
// });

// db.Users.update({
//   uid: /^leonard_shi\+dev_00.*$/
// }, {
//   $set: {
//     groups: ['9ac1a7af-5d81-4b66-9234-3d19abe1c0a2']
//   }
// }, {
//   upsert: false,
//   multi: true
// });


