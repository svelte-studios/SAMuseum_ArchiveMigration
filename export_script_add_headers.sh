rootDir=$PWD
find . -name "*.accdb" | while read -r dbpath;  do dirName=${dbpath%/*};  echo $dirName;  dbname=${dbpath##*/};  echo $dbname;  cd $dirName;   
mdb-tables -1 $dbname | while read -r tablename; do echo $tablename; fname=$(echo "$tablename" | tr -d '()' | tr ' ' '_' ).csv; echo $fname; 
header=$(head -n 1 old.$fname); (echo $header; cat $fname;) > new.$fname; rm old.$fname; rm $fname; mv new.$fname $fname; done; cd $rootDir; done