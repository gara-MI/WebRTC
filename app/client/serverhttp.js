var fs = require("fs");
var http = require("http");
var url = require("url");

http.createServer(function (request, response) {

    var pathname = url.parse(request.url).pathname;
    console.log("Request for " + pathname + " received.");

    

    if(pathname == "/") {
		response.writeHead(200);
        html = fs.readFileSync("caller.html", "utf8");
        response.write(html);
    } else{
		try{
			response.writeHead(200);
			script = fs.readFileSync(pathname.substring(1), "utf8");
			response.write(script);
		}
		catch(e){
			response.writeHead(404);
		}
    }


    response.end();
}).listen(8089);

console.log("Listening to server on 8089...");
