params=${1}
params=${params//$/\\$}
params=${params//\"/\\\"}
params=${params//\)/\\\)}
params=${params//\(/\\\(}
bash -c "task add ${params}"
