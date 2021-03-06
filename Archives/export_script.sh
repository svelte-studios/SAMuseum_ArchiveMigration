rootDir=$PWD
find . -name "*.accdb" | while read -r dbpath;  do dirName=${dbpath%/*};  echo $dirName;  dbname=${dbpath##*/};  echo $dbname;  cd $dirName;   
mdb-tables -1 $dbname | while read -r tablename; do echo $tablename; fname=$(echo "$tablename" | tr -d '()' | tr ' ' '_' ).csv; echo $fname; 
mdb-export -D '%Y-%m-%d %H:%M:%S' $dbname "$tablename" > "old.$fname"; done; cd $rootDir;  done