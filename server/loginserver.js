const CommandPacket = require('./packet.js');

    function analyse_command(packet, cmd, param) {
        switch (cmd) {
            case 'login':
                try {
                const datab = require('./database');
                datab.db_init();
        
                const loginData = param;
                console.log(loginData);
                datab.user_login(loginData["username"], loginData["password"], (token)=>{
                    if (token > 0) {
                        console.log(loginData["username"], "gets token:", token);
                        this.response_success(packet.sender_socket, token);
                    }else{
                        console.log(loginData["username"], "login failed.");
                        packet.sender_socket.close(1000, `Incorrect username or password.`);
                    }
                });
                } catch (e) {
                    console.log("error parsing direct message JSON", e);
                }
                break;
            case 'token':
                try {
                    const datab = require('./database');
                    datab.db_init();
        
                    const loginData = param;
                    response_success(packet.sender_socket, loginData["token"]);

                } catch (e) {
                    console.log("error parsing direct message JSON", e);
                }
                break;
            default:
                console.log("default", cmd, param);
        }
        
    };

    function response_success(client, token) {
        const datab = require('./database');
        datab.fetch_user_data(token, (data)=>{
            response(client, "success", data);
        });
    };
    function response(client, command, data) {
        const a = new CommandPacket("login");
        a.addCommand(command,data)
        client.send(a.serialize());
    };



module.exports = {analyse_command};