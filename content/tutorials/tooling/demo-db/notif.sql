insert into notifications (recipient_id,kind,task_id,client_id,title,body,created_at)
select '00000000-0000-0000-0000-000000000005','client_revise',id,client_id,'ลูกค้าขอแก้ (รอบที่ 1): ร้านกาแฟบ้านสวน · บาริสต้าเล่าเบื้องหลัง','0:12 ตัดช่วงพูดซ้ำออก / ใส่ซับให้ใหญ่ขึ้น', now() - interval '3 hours' from tasks where title='บาริสต้าเล่าเบื้องหลัง';
insert into notifications (recipient_id,kind,task_id,client_id,title,created_at)
select '00000000-0000-0000-0000-000000000005','editor_assigned',id,client_id,'คุณได้รับงานตัดต่อ: คลินิกฟันยิ้มสวย · รีวิวคนไข้จริง', now() - interval '1 day' from tasks where title='รีวิวคนไข้จริง';
insert into notifications (recipient_id,kind,task_id,client_id,title,created_at)
select '00000000-0000-0000-0000-000000000002','handoff',id,client_id,'ส่งต่อไป QC: ร้านกาแฟบ้านสวน · 5 เมนูขายดี', now() - interval '2 hours' from tasks where title='5 เมนูขายดี';
insert into notifications (recipient_id,kind,task_id,client_id,title,body,created_at)
select '00000000-0000-0000-0000-000000000002','client_pass',id,client_id,'ลูกค้าอนุมัติแล้ว: ร้านกาแฟบ้านสวน · โปรวันเกิดร้าน','สถานะ ผ่าน — รอโพส', now() - interval '5 hours' from tasks where title='โปรวันเกิดร้าน';
