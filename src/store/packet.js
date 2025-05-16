class CommandPacket {
  constructor(header = "", session = "") {
    this.header = header;
    this.session = session;
    this.commands = [];

    this.sender = "";
    this.receiver = "";

  }
  
  addCommand(cmd, param) {
    this.commands.push({ cmd, param });
  }

  serialize() {
    return JSON.stringify({
      header: this.header,
      session: this.session,
      commands: this.commands
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
      const packet = new CommandPacket(obj.header);
      if (Array.isArray(obj.commands)) {
        packet.commands = obj.commands;
      }
      return packet;
    } catch (e) {
      console.error("反序列化失败:", e);
      return null;
    }
  }

}

module.exports = CommandPacket;
