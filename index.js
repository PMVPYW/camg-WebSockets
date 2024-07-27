//default config
const api_url = "http://34.155.37.245/api/";
const httpServer = require("http").createServer();
const { Server } = require("socket.io");
const { GoogleAuth } = require('google-auth-library');
const { instrument } = require("@socket.io/admin-ui");
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function getUserCount(room) {
  const roomData = io.sockets.adapter.rooms.get(room);
  return roomData ? roomData.size : 0;
}

const KEYFILEPATH = 'service_account_file.json';
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
const PROJECT_ID = 'camgapp-92f5e';

async function sendFCMMessage(tokens, not) {
    const auth = new GoogleAuth({
        keyFile: KEYFILEPATH,
        scopes: SCOPES,
    });

    const accessToken = await auth.getAccessToken();

    const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    
    tokens.forEach(tk=>{  
        fetch(url, {method: "POST", headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
        body: JSON.stringify({
                "message": {
                  "token": tk.token,
                  "notification": {
                    "title": not.titulo,
                    "body": not.descricao,
                  }
                }
        })}).then((response)=>{
            console.log(tk.token, " token", response.status)  
        })
              
    });
}


instrument(io, {
  auth: false,
  mode: "development",
});

httpServer.listen(8080, () => {
  console.log("listening on *:8080");
});

//end default config

var rallyes = [];

fetch(api_url + "rally").then(response => {
            return response.json(); 
        })
        .then(data => {
            rallyes = data.data;
        }).catch(error=> {
        	console.error("error");
        });
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
function handler(url, content, name, channel=null) {
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
            if (channel)
            {
            	io.to(channel).emit(name, content);
            	io.to("stats").emit(name, content);
            } else {
            	io.timeout(10000).emit(name, content);
            }
            
        }
    }).catch(error => {
        console.error(error)
    })
}

function handler_itineraries(url, content, name, channel=null) {
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
            var arr = [];
            content.value.data.itineraries.forEach((item)=>{
            	arr = arr.concat([...item.specials])
            })
            
            content.value = [...arr];
            if (channel)
            {
            	io.to(channel).emit(name,arr);
            } else {
            	io.timeout(10000).emit(name, arr);
            }
            
        }
    }).catch(error => {
        console.error(error)
    })
}

function handler_classifications()
{
	rallyes.forEach((rally)=>{
		let new_class = {}
		if(!itineraries.value[rally.external_entity_id])
		{
		   itineraries.value[rally.external_entity_id] = {value: []}
		}
		console.log(rally.id, rally.nome, rally.data_inicio)
		let promises = [];
		if(itineraries.value[rally.external_entity_id].value !== null)
		{
            request_itineraries(`https://rest3.anube.es/rallyrest/timing/api/itineraries/${rally.external_entity_id}.json`).then(response => {
                    itineraries.value[rally.external_entity_id].value.forEach(itinerary => {
                        console.log(`https://rest3.anube.es/rallyrest/timing/api/classification/${rally.external_entity_id}.json?itinerary_id=${response.event.data[0].id}&special_id=` + itinerary.id)
                        //handler("https://rest3.anube.es/rallyrest/timing/api/classification/111.json?itinerary_id=182&special_id=" + itinerary.id, a, "#")
                        let promise = request_itineraries(`https://rest3.anube.es/rallyrest/timing/api/classification/${rally.external_entity_id}.json?itinerary_id=${response.event.data[0].id}&special_id=` + itinerary.id).then(response => {
                            const new_content = response.event.data

                            new_class[itinerary.id] = new_content

                        }).catch(error => {
                            console.error(error)
                        })
                        promises.push(promise);
                    }  ) 
                });

			if (!classifications.value[rally.external_entity_id])
			{
				classifications.value[rally.external_entity_id] = {value: null}
			}else{
			    Promise.all(promises).then(() => {
				if (!objectComparer(classifications.value[rally.external_entity_id], new_class))
				{
				    classifications.value[rally.external_entity_id] = {value: new_class}
				    console.log("broadcasting", "classifications")
				    io.to(`rally_${rally.external_entity_id}`).emit("classifications", classifications.value[rally.external_entity_id].value);
				}
                })
                .catch(error => {
                    console.error(error);
                });
            }
            console.log("classifications", classifications.value)
		}
	});
    
   
}

const handle_rallyes_participants = ()=>{
	rallyes.forEach((rally) => {
	if (!participants.value[rally.external_entity_id]?.value)
	{
		participants.value[rally.external_entity_id] = {value: null};
	}
	handler(`https://rest3.anube.es/rallyrest/timing/api/participants/${rally.external_entity_id}.json`, participants.value[rally.external_entity_id], "participants", channel=`rally_${rally.external_entity_id}`)
	});
	
}

const handle_rallyes_itineraries = ()=>{
	rallyes.forEach((rally) => {
	if (!itineraries.value[rally.external_entity_id]?.value)
	{
		itineraries.value[rally.external_entity_id] = {value: null};
	}
	handler_itineraries(`https://rest3.anube.es/rallyrest/timing/api/specials/${rally.external_entity_id}.json`, itineraries.value[rally.external_entity_id], "itineraries", channel=`rally_${rally.external_entity_id}`)
	});
	
}



//end of handle functions

//set interval of handle functions

//setInterval(handle_itineraries, 5000)
//setInterval(handle_participants, 5000)
setInterval(handle_rallyes_participants, 5000)
setInterval(handle_rallyes_itineraries, 5000)
setInterval(handler_classifications, 5000)


//end of calls

//socket handling (when first connected)

io.on("connection", (socket) => {
  /*
  * código dos sockets aqui.
  * socket.on(...)
  */
  	socket.emit("participants", participants);
  	socket.emit("itineraries", itineraries);
	socket.emit("classifications", classifications);
	
	socket.on("participants", ()=>{
		socket.rooms.forEach((item)=>{
			if (participants.value[item.replace("rally_", "")])
			{
				socket.emit("participants", participants.value[item.replace("rally_", "")].value, item.replace("rally_", ""))
			}
		});

	});
  	socket.on("itineraries", ()=>{
  	socket.rooms.forEach((item)=>{
			if (itineraries.value[item.replace("rally_", "")])
			{
				socket.emit("itineraries", itineraries.value[item.replace("rally_", "")].value, item.replace("rally_", ""))
			}
		});
  	});
	socket.on("classifications", ()=>{
			socket.rooms.forEach((item)=>{
			if (classifications.value[item.replace("rally_", "")])
				{
					socket.emit("classifications", classifications.value[item.replace("rally_", "")].value, item.replace("rally_", ""))
				}
			});

	});


//end of socket handling (when first connected)

//handle crud actions
//rally
    socket.on("stats", function(){
        socket.join("stats");
        io.to("stats").emit("clients", getUserCount("app_client"))
    })
    socket.on("app_client", function(){
        socket.join("app_client");
        socket.on('disconnect', () => {
            io.to("stats").emit("clients", getUserCount("app_client"))
        })
        console.log("user_rooms", getUserCount("app_client"))
        io.to("stats").emit("clients", getUserCount("app_client"))
    })
	socket.on("join_rally", function(rally_external_id)
	{
		socket.join(`rally_${rally_external_id}`);
	});
	
	socket.on("leave_all_rooms", function()
	{
		const rooms = socket.rooms;
		rooms.forEach((room) => {
			socket.leave(room);
		});
			
	});


	socket.on("create_rally", function (rally) {
		socket.broadcast.emit("create_rally", rally);
		rallyes.push(rally);
		handle_rallyes_participants();
	});
	socket.on("update_rally", function (rally) {
		socket.broadcast.emit("update_rally", rally);
		const index = rallyes.findIndex((item)=>rally.id == item.id);
		if (index > -1)
		{
			rallyes[index] = rally;
		}
	});
	socket.on("delete_rally", function (rally) {
		socket.broadcast.emit("delete_rally", rally);
		rallyes = rallyes.filter((item)=>item.id != rally.id);
		delete participants.value[rally.external_entity_id];
		io.to("stats").emit("participants", participants)
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
    socket.on("update_patrocinio", function (patrocinio) {
        socket.broadcast.emit("update_patrocinio", patrocinio);
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

//Patrocinio Oficial
    socket.on("associar_patrocinio_oficial", function (patrocinio) {
        socket.broadcast.emit("associar_patrocinio_oficial", patrocinio);
    });
    socket.on("desassociar_patrocinio_oficial", function (patrocinio) {
        socket.broadcast.emit("desassociar_patrocinio_oficial", patrocinio);
    });
    socket.on("update_patrocinio_oficial", function (patrocinio) {
        socket.broadcast.emit("update_patrocinio_oficial", patrocinio);
    });
    socket.on("delete_entidade_oficial", () => {
        socket.broadcast.emit("delete_entidade_oficial");
    });
    socket.on("create_entidade_oficial", function (entidade, patrocinio){
        socket.broadcast.emit("create_entidade_oficial", entidade, patrocinio);
    });
    socket.on("update_entidade_oficial", function (entidade, patrocinio){
        socket.broadcast.emit("update_entidade_oficial", entidade, patrocinio);
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
    socket.on("admin_atualizado", function (admin) {
        socket.broadcast.emit("admin_atualizado", admin);
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
    
//Tipo de Contactos
    socket.on("create_tipocontacto", function (tipocontacto) {
        socket.broadcast.emit("create_tipocontacto", tipocontacto);
    });

    socket.on("delete_tipocontacto", function (tipocontacto){
        socket.broadcast.emit("delete_tipocontacto", tipocontacto);
    });

    socket.on("update_tipocontacto", function (tipocontacto){
        socket.broadcast.emit("update_tipocontacto", tipocontacto);
    });

//horarios
    socket.on("create_horario", function (horario) {
        socket.broadcast.emit("create_horario", horario);
    });

    socket.on("delete_horario", function (horario){
        socket.broadcast.emit("delete_horario", horario);
    });

    socket.on("update_horario", function (horario){
        socket.broadcast.emit("update_horario", horario);
    });
    
    socket.on("create_conselho_seguranca", function (conselho){
        socket.broadcast.emit("create_conselho_seguranca", conselho);
    });
    
    socket.on("update_conselho_seguranca", function (conselho){
        socket.broadcast.emit("update_conselho_seguranca", conselho);
    });
    
    socket.on("delete_conselho_seguranca", function (conselho){
        socket.broadcast.emit("delete_conselho_seguranca", conselho);
    });
    
    //canais notificação
    socket.on("notify_app_users", function (obj, devices_list){
        console.log(devices_list.length, "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$\n", obj, devices_list)
        sendFCMMessage(devices_list, obj);
});
});
