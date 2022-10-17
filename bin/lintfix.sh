#!/bin/sh
sed "s/<?php /<?php\n\/\/ phpcs:ignore\n/" build/index.asset.php | sed "s/);/);\n/" > build/index.asset.php.new
mv build/index.asset.php.new build/index.asset.php
