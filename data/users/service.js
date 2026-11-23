const config = require("../../config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

function UserService(UserModel) {
  let service = {
    create,
    createToken,
    verifyToken,
    findUser,
    autorize,
    update,
    findAll,
    findUserById
  };

  function create(user) {
    return createPassword(user).then((hashPassword, err) => {
      if (err) {
        return Promise.reject("Not saved the user");
      }

      let newUserWithPassword = {
        ...user,
        password: hashPassword,
      };

      let newUser = UserModel(newUserWithPassword);
      return save(newUser);
    });
  }

  function createToken(user) {
    let token = jwt.sign({ id: user._id, name: user.name, role: user.role.scope }, config.secret, {
      expiresIn: config.expiresPassword,
    });

    return { auth: true, token };
  }


  function verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          reject();
        }
        return resolve(decoded);
      });
    });
  }

  function save(model) {
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      model.save(function (err) {
        if (err) reject("There is a problema with register");

        resolve({
          message: 'User saved',
          user: model,
        });
      });
    });
  }

  function update(id, user) {
    console.log('user', user);
    return new Promise(function (resolve, reject) {
      console.log('user', user);
      UserModel.findByIdAndUpdate(id, user, { runValidators: true }, function (err, userUpdated) { //runValidators: true se nao tivesse isto ao tentar atualizar o user podia se meter qualquer texrto ao inves de member e notmmeber

        if (err) reject('Dont updated User');
        resolve(userUpdated);
      });
    });
  }

  function findAll({ pagination }) { // ESTAVA ASSIM ANTES DE FAZER OQ PEDE NA AULA 4 function findAll({ limit, skip }) {
    /*   ESTAVA ASSIM ANTES DE FAZER OQ PEDE NA AULA 4
    return UserModel.find({}, { password: 0 }, { skip, limit })
        .then(async (users) => {
          const total = await UserModel.countDocuments();
          return {
            data: users,
            pagination: { pageSize: limit, page: Math.floor(skip / limit), hasMore: skip + limit < total, total },
          };
        }); */
    const { limit, skip } = pagination;

    return new Promise(function (resolve, reject) {
      UserModel.find({}, {}, { skip, limit }, function (err, users) {
        if (err) reject(err)

        resolve(users);
      });
    }).then(async (users) => {
      const totalPlayers = await UserModel.count();

      return Promise.resolve({
        data: users,
        pagination: {
          pageSize: limit,
          page: Math.floor(skip / limit),
          hasMore: skip + limit < totalPlayers,
          total: totalPlayers,
        },
      });
    });
  }   // <-- esta


  /*     function findUserById({ _id, password }) {
        return new Promise(function (resolve, reject) {
          UserModel.findOne({ _id }, function (err, user) {
            if (err) reject(err);
            //object of all users
  
            if (!_id) {
              reject("This data is wrong");
            }
            resolve(user);
          });
        }).then((user) => {
          return comparePassword(password, user.password).then((match) => {
            if (!match) return Promise.reject("User not valid");
            return Promise.resolve(user);
          });
        });
      } */

  //CLAUDE MANDOU ISTO 
  function findUserById(id) {
    return UserModel.findById(id).then((user) => {
      if (!user) return Promise.reject("User not found");
      return user;
    });
  }

  function findUser({ name, password, isQrCode }) {
    return new Promise(function (resolve, reject) {
      UserModel.findOne({ name }, function (err, user) {
        if (err) reject(err);
        //object of all users

        if (!user) {
          reject("This data is wrong");
        }
        resolve(user);
      });
    }).then((user) => {
      if (isQrCode) {
        return user.password === password ? Promise.resolve(user) : Promise.reject("User not valid");
      }
      return comparePassword(password, user.password).then((match) => {
        if (!match) return Promise.reject("User not valid");
        return Promise.resolve(user);
      });
    });
  }

  //devolver a password encryptada
  function createPassword(user) {
    return bcrypt.hash(user.password, config.saltRounds);
  }

  //devolver se a password é ou não a mesma
  function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  function autorize(scopes) {
    return (request, response, next) => {

      const { roleUser } = request; //Este request só tem o roleUser porque o adicionamos no ficheiro players
      const hasAutorization = scopes.some(scope => roleUser.includes(scope));

      if (roleUser && hasAutorization) {
        next();
      } else {
        response.status(403).json({ message: "Forbidden" }); //acesso negado
      }
    };
  }

  return service;
}

module.exports = UserService;
