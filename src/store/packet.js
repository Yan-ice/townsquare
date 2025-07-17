class CommandPacket {
  constructor(header = "", session = "") {
    this.header = header;
    this.session = session;
    this.sender = "";
    this.receiver = "";
    this.commands = [];
    
    //this.sender_socket = ''; //should be filled immediately after deserializing.
  }
  
  addCommand(cmd, param) {
    this.commands.push({ cmd, param });
  }

  serialize() {
    return JSON.stringify({
      header: this.header,
      session: this.session,
      commands: this.commands,
      sender: this.sender,
      receiver: this.receiver,
    });
  }
  
  forEachCommand(callback){
    this.commands.forEach((block) => {
          callback(this, block['cmd'], block['param']);
      });
  }

  static deserialize(jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      const packet = new CommandPacket(obj.header, obj.session);
      packet.sender = obj.sender;
      packet.receiver = obj.receiver;
      if (Array.isArray(obj.commands)) {
        packet.commands = obj.commands;
      }
      return packet;
    } catch (e) {
      console.log("反序列化失败:", e);
      return null;
    }
  }

}

module.exports = CommandPacket;
