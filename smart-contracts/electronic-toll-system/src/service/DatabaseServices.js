require('pouchdb').default;

export const persist = (db, object) => {

  let doc = { "_id": object["id"] }
  return db.get(object["id"])
    .then((_doc) => {
      doc = _doc
      for (const i in object.tuple) {
        doc[object.tuple[i].key] = object.tuple[i].value;
      }
      return db.put(doc)
    })
    .catch((error) => {
      if (error.reason === "missing") {
        doc = { "_id": object["id"] }
        for (const i in object.tuple) {
          doc[object.tuple[i].key] = object.tuple[i].value;
        }
        return db.put(doc)
      }
      else {
        throw new Error(error);
      }
    })

}

export const getAllTollBoothOperators = (db) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        return results.rows.map(obj => {
            return obj.doc})})

}

export const inDocuments = (db, attributes, values) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        let filtered = results.rows;
        for (let i = 0; i < attributes.length; i++) {
            filtered = filtered.filter(obj => obj.doc[attributes[i]] === values[i])
        }
        if (filtered.length === 0) {
            return true;
        }
        throw new Error(values + " already exists")
    })

}

export const getAllTollBooths = (db, tollBoothOperator) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        return results.rows
        .filter(opt => tollBoothOperator.address === opt.doc.tollBoothOperator)
        .map(obj => {
            return obj.doc})})

}

export const getAllMultipliers = (db, tollBoothOperator) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        return results.rows
        .filter(opt => tollBoothOperator.address === opt.doc.tollBoothOperator)
        .map(obj => {
            return obj.doc})})

}

export const getRoutes = ({db, tollBoothOperator, entryTollBoothName, exitTollBoothName}) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        return results.rows
        .filter(opt => (tollBoothOperator.address !== undefined ? (tollBoothOperator.address === opt.doc.tollBoothOperator) : true))
        .filter(opt => (entryTollBoothName !== undefined ? (entryTollBoothName === opt.doc.entryTollBoothName) : true))
        .filter(opt => (exitTollBoothName !== undefined ? (exitTollBoothName === opt.doc.exitTollBoothName) : true))
        .map(obj => {
            return obj.doc})})

}

export const getVehicles = ({db, address}) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        return results.rows
        .filter(opt => (address !== undefined ? (address === opt.doc.address) : true))
        .map(obj => {
            return obj.doc})})

}

export const getTrips = ({db, vehicle, tollBoothOperator, hashedSecret}) => {

  return db.allDocs({include_docs: true})
  .then ( (results) => {
      return results.rows
      .filter(opt => (vehicle !== undefined ? (vehicle === opt.doc.vehicle) : true))
      .filter(opt => (tollBoothOperator !== undefined ? (tollBoothOperator === opt.doc.tollBoothOperator) : true))
      .filter(opt => (hashedSecret !== undefined ? (hashedSecret === opt.doc.hashedSecret) : true))
      .map(obj => {
          return obj.doc})})

}

export const clearDatabase = (db) => {

    return db.allDocs({include_docs: true})
    .then(allDocs => allDocs.rows.map(row => {
            return {_id: row.id, _rev: row.doc._rev, _deleted: true}}))
    .then(deleteDocs => {
        return db.bulkDocs(deleteDocs);
    });

}

export const getTollBooth = (db, tollBoothOperator, tollBoothAddress) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        let filtered = results.rows.filter(opt => tollBoothOperator.address === opt.doc.tollBoothOperator)
        filtered = filtered.filter(opt => tollBoothAddress === opt.doc.address)

        if (filtered.length !== 1) {
            throw new Error("Cannot find toll booth name of operator: " + tollBoothOperator.address + 
                " and toll booth address: " + tollBoothAddress);
        }
        else {
            return filtered[0].doc;
        }
    })

}

export const getTollBoothOperator = ({db, tollBoothOperatorAddress, tollBoothOperatorName}) => {

  return db.allDocs({include_docs: true})
  .then ( (results) => {
      let filtered = results.rows;
      if (tollBoothOperatorAddress !== undefined) {
        filtered = filtered.filter(opt => tollBoothOperatorAddress === opt.doc.address);
      }
      if (tollBoothOperatorName !== undefined) {
        filtered = filtered(opt => (tollBoothOperatorName !== null ? (tollBoothOperatorName === opt.doc.name) : true))
      }
      if (filtered.length !== 1) {
          throw new Error("Cannot find toll booth operator");
      }
      else {
        return filtered[0].doc;
      }})

}

export const getVehicle = (db, vehicleAddress) => {

    return db.allDocs({include_docs: true})
    .then ( (results) => {
        let filtered = results.rows.filter(opt => vehicleAddress === opt.doc.address);

        if (filtered.length !== 1) {
            throw new Error("Cannot find the vehicle name of address: " + vehicleAddress);
        }
        else {
            return filtered[0].doc;
        }
    })

}
