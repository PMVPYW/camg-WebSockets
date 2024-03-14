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




//start original vars
let itineraries = {};

//end original vars

//handle functions

function handle_itineraries() {
    const request_itineraries = async ()=>{
        const url = 'https://rest3.anube.es/rallyrest/timing/api/specials/111.json?itinerary_id=182';
        const options = {method: 'GET'};
        return fetch(url, options)
            .then(response => {
                return response.json(); 
            })
            .then(data => {
                return data;
            });
    }

    request_itineraries().then(response => {
        const new_itineraries = response.event
        if (!objectComparer(itineraries, new_itineraries))
        {
            itineraries = {...new_itineraries}
            console.log("broadcasting itineraries")
            io.timeout(10000).emit("itineraries", itineraries);
        }
    }).catch(error => {
        console.error(error)
    })
}

//end of handle functions

//set interval of handle functions

setInterval(handle_itineraries, 5000)

//end of calls

//socket handling (when first connected)

io.on("connection", (socket) => {
  /*
  * código dos sockets aqui.
  * socket.on(...)
  */

});

//end of socket handling (when first connected)