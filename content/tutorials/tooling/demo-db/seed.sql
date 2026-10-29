insert into positions (id,name,sort_order,hide_internal,own_only) values
 ('00000000-0000-0000-0000-0000000000a1','โปรดิวเซอร์',1,false,false),
 ('00000000-0000-0000-0000-0000000000a2','ช่างภาพ',2,false,false),
 ('00000000-0000-0000-0000-0000000000a3','ตัดต่อ',3,false,false),
 ('00000000-0000-0000-0000-0000000000a4','ตัดต่อ Outsource',4,true,true);
insert into teams (id,name,sort_order) values ('00000000-0000-0000-0000-0000000000b1','ทีม A',1),('00000000-0000-0000-0000-0000000000b2','ทีม B',2);
insert into staff (id,name,position,position_id,team_id,role,pin_hash,is_active,avatar_color,base_salary,hire_date) values
 ('00000000-0000-0000-0000-000000000001','พี่โอ๊ต','เจ้าของ',null,null,'owner','$2b$08$GK9blzbaNz82zQYaji.V3.ZgOXPSjA.zYuDkmVtmlQbUprn9vVhSu',true,'bg-orange-500',0,'2023-01-01'),
 ('00000000-0000-0000-0000-000000000002','เมย์','โปรดิวเซอร์','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','staff','$2b$08$GK9blzbaNz82zQYaji.V3.ZgOXPSjA.zYuDkmVtmlQbUprn9vVhSu',true,'bg-violet-500',25000,'2024-03-01'),
 ('00000000-0000-0000-0000-000000000003','บอส','ช่างภาพ','00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b1','staff','$2b$08$GK9blzbaNz82zQYaji.V3.ZgOXPSjA.zYuDkmVtmlQbUprn9vVhSu',true,'bg-sky-500',22000,'2024-05-01'),
 ('00000000-0000-0000-0000-000000000004','จูน','ตัดต่อ','00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b1','staff','$2b$08$GK9blzbaNz82zQYaji.V3.ZgOXPSjA.zYuDkmVtmlQbUprn9vVhSu',true,'bg-emerald-500',22000,'2024-06-01'),
 ('00000000-0000-0000-0000-000000000005','ฟ้า','ตัดต่อ Outsource','00000000-0000-0000-0000-0000000000a4',null,'staff','$2b$08$GK9blzbaNz82zQYaji.V3.ZgOXPSjA.zYuDkmVtmlQbUprn9vVhSu',true,'bg-rose-500',0,'2025-09-01');
