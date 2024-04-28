//default config

const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
httpServer.listen(8080, () => {
  console.log("listening on *:8080");
});
//end default config
function objectComparer(obj1, obj2)
{
    const keys1 = Object.keys(obj1 ?? {});
    const keys2 = Object.keys(obj2 ?? {});
    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let key of keys1) {
        if (!obj2.hasOwnProperty(key)) {
            return false;
        }
        if (typeof(obj1[key]) === "object")
        {
            if (!objectComparer(obj1[key], obj2[key]))
            {
                return false
            }
        } else {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
        
    }

    return true;
}

const request_itineraries = async (url)=>{
    const options = {method: 'GET'};
    return fetch(url, options)
        .then(response => {
            return response.json(); 
        })
        .then(data => {
            return data;
        });
}



//start original vars
let itineraries = {value:{}};
let participants = {value:{}};
let classifications = {value:{}};

//end original vars

//handle functions
function handler(url, content, name) {
    request_itineraries(url).then(response => {
        const new_content = response.event
        if (!objectComparer(content.value, new_content))
        {
            content.value = {...new_content}
            if (name == "#")
            {
                return;
            }
            console.log("broadcasting", name)
            io.timeout(10000).emit(name, content.value);
        }
    }).catch(error => {
        console.error(error)
    })
}

function handler_classifications()
{
    let new_class = {}
    if(!itineraries.value.data)
    {
        //itineraries is empty
        return
    }

    let promises = [];
    
    itineraries.value.data.forEach(itinerary => {

        //handler("https://rest3.anube.es/rallyrest/timing/api/classification/111.json?itinerary_id=182&special_id=" + itinerary.id, a, "#")
        let promise = request_itineraries("https://rest3.anube.es/rallyrest/timing/api/classification/111.json?itinerary_id=182&special_id=" + itinerary.id).then(response => {
            const new_content = response.event.data.accumulated
            //console.log(new_content, "new_content")
            new_class[itinerary.id] = new_content
            //console.log("\n", new_class[itinerary.id], "\nid: ", itinerary.id, "\n\n\n")
        }).catch(error => {
            console.error(error)
        })
        promises.push(promise);
    }  ) 
    Promise.all(promises)
        .then(() => {
        if (!objectComparer(classifications.value, new_class))
        {
            classifications.value = new_class
            console.log("broadcasting", "classifications")
            io.timeout(10000).emit("classifications", classifications.value);
        }
    })
    .catch(error => {
        console.error(error);
    });
   
}

//end of handle functions

//set interval of handle functions

//setInterval(handle_itineraries, 5000)
//setInterval(handle_participants, 5000)
setInterval(()=>handler("https://rest3.anube.es/rallyrest/timing/api/participants/111.json", participants, "participants"), 5000)
setInterval(()=>handler("https://rest3.anube.es/rallyrest/timing/api/specials/111.json?itinerary_id=182", itineraries, "itineraries"), 5000)
setInterval(handler_classifications, 5000)

//end of calls

//socket handling (when first connected)

io.on("connection", (socket) => {
  /*
  * código dos sockets aqui.
  * socket.on(...)
  */
  	socket.emit("participants", participants.value);
  	socket.emit("itineraries", itineraries.value);
	socket.emit("classifications", classifications.value);
	
	socket.on("participants", ()=>{socket.emit("participants", participants.value);});
  	socket.on("itineraries", ()=>{socket.emit("itineraries", itineraries.value)});
	socket.on("classifications", ()=>{socket.emit("classifications", classifications.value)});


//end of socket handling (when first connected)

//handle crud actions
//rally
	socket.on("create_rally", function (rally) {
		socket.broadcast.emit("create_rally", rally);
	});
	socket.on("update_rally", function (rally) {
		socket.broadcast.emit("update_rally", rally);
	});
	socket.on("delete_rally", function (rally) {
		socket.broadcast.emit("delete_rally", rally);
	});
	
	socket.on("create_album", function (album) {
		socket.broadcast.emit("create_album", album);
	});
	socket.on("update_album", function (album) {
		socket.broadcast.emit("update_album", album);
	});
	socket.on("delete_album", function (album) {
		socket.broadcast.emit("delete_album", album);
	});
	
	socket.on("create_foto", function (album_id, foto) {
		socket.broadcast.emit("create_foto", album_id, foto);
	});
	socket.on("update_foto", function (album_id, foto) {
		socket.broadcast.emit("update_foto", album_id, foto);
	});
	socket.on("delete_foto", function (album_id, foto) {
		socket.broadcast.emit("delete_foto", album_id, foto);
	});


//Patrocinio
    socket.on("associar_patrocinio", function (patrocinio) {
        socket.broadcast.emit("associar_patrocinio", patrocinio);
    });
    socket.on("desassociar_patrocinio", function (patrocinio) {
        socket.broadcast.emit("desassociar_patrocinio", patrocinio);
    });
    socket.on("delete_entidade", () => {
        socket.broadcast.emit("delete_entidade");
    });
    socket.on("create_entidade", function (entidade, patrocinio){
        socket.broadcast.emit("create_entidade", entidade, patrocinio);
    });
    socket.on("update_entidade", function (entidade, patrocinio){
        socket.broadcast.emit("update_entidade", entidade, patrocinio);
    });

//admins
	socket.on("admin_registado", function (admin) {
        socket.broadcast.emit("admin_registado", admin);
    });
	socket.on("admin_eliminado", function (admin_id) {
        socket.broadcast.emit("admin_eliminado", admin_id);
    });
    socket.on("admin_autorizado", function (admin) {
        socket.broadcast.emit("admin_autorizado", admin);
    });
    socket.on("admin_bloqueado_desbloquado", function (admin) {
        socket.broadcast.emit("admin_bloqueado_desbloquado", admin);
    });

//Noticia
    socket.on("create_noticia", function (noticia) {
        socket.broadcast.emit("create_noticia", noticia);
    });

    socket.on("delete_noticia", function (noticia){
        socket.broadcast.emit("delete_noticia", noticia);
    });

    socket.on("update_noticia", function (noticia){
        socket.broadcast.emit("update_noticia", noticia);
    });

//Contactos
    socket.on("create_contacto", function (contacto) {
        socket.broadcast.emit("create_contacto", contacto);
    });

    socket.on("delete_contacto", function (contacto){
        socket.broadcast.emit("delete_contacto", contacto);
    });

    socket.on("update_contacto", function (contacto){
        socket.broadcast.emit("update_contacto", contacto);
    });

});
