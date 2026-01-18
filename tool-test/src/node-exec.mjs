import { spawn } from 'node:child_process';

const command = 'echo -e "n\\nn" | pnpm create vite react-todo-app --template react-ts';

const cwd = process.cwd();

console.log(cwd);


const [cmd, ...args] = command.split(' ');

const child = spawn(cmd, args, {
    cwd,
    // 把子进程的 stdout 输出到父进程的 stdout
    stdio:'inherit',
    shell:true
});

let errorMessage = '';

child.on('error', (err) => {
    errorMessage = err.message;
});

child.on('close', (code) =>{
    console.log(`子进程退出，退出码 ${code}`);
    if (code === 0) {
        process.exit(0);
    } else {
       if (errorMessage) {
        console.error(errorMessage);
       }
       process.exit(code || 1);
    }
});
